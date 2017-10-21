'use strict';
const { Client } = require('pg');

class QuizManager {

    constructor() {
        this.client = new Client();
        this._subscrine_correct_regex = new RegExp('^juta_yuki_correct ([A-D])$');
        this._get_currect_stage_query = 'select coalesce((select max(stage) + 1 from corrects), 0) as current_stage;';
    }


    is_answer(text){
        // 半角大文字小文字、全角大文字小文字(\uff21が全角A)のa-dを許可
        let re = new RegExp('^[a-d|A-D|\uff21-\uff24|\uff41-\uff44]$');
        if ( text.match(re) ){
            return true;
        }
        return false;
    }

    _cleansing_answer_string(answer){
        let re_A = new RegExp('^[a|A|\uff21|\uff41]$');
        let re_B = new RegExp('^[b|B|\uff22|\uff42]$');
        let re_C = new RegExp('^[c|C|\uff23|\uff43]$');
        let re_D = new RegExp('^[d|D|\uff24|\uff44]$');
        if ( answer.match(re_A) ){
            return "A";
        }
        else if ( answer.match(re_B) ){
            return "B";
        }
        else if ( answer.match(re_C) ){
            return "C";
        }
        else if ( answer.match(re_D) ){
            return "D";
        }
        throw new Error("Invalid answer string");
    }

    answer(user_name, answer_string) {
        const answer = this._cleansing_answer_string(answer_string);
        return this.client.connect()
            .then(res => {
            //現在の設問番号を取得
                return this.client.query(this._get_currect_stage_query);
            }).then(res => {
                //解答を入力
                return this.client.query(
                    'insert into answers (stage, user_id, answer) values($1, $2, $3) returning *',
                    [
                        res.rows[0].current_stage,
                        user_name,
                        answer
                    ]).catch(err => {
                        //再解答の場合の処理
                        //23505はUnique制約エラー ＝ すでに解答がされているのにINSERTしようとした
                        //その場合は解答をアップデート
                        if (err.code == 23505) {
                            return this.client.query(
                                'update answers set answer = $3 where stage = $1 and user_id = $2 returning *',
                                [
                                    res.rows[0].current_stage,
                                    user_name,
                                    answer
                                ]);
                        }
                        throw err;
                    });
            }).then(res => {
                this.client.end();
                let response_message = "解答を「" + answer + "」で受け付けました。";
                if (res.command === "UPDATE") {
                    response_message = "解答を「" + answer + "」で更新しました。"
                }
                return Promise.resolve(response_message);
            }).catch(err => {
                this.client.end();
                console.log("get_current_stage", err);
                return Promise.reject(new Error("申し訳ございません。回答を受け付けることができませんでした。再送してください。"));
 
            });
    }


    get_current_stage() {
        let response = null;
        return this.client.connect()
            .then(res => {
                //現在の設問番号を取得
                return this.client.query(this._get_currect_stage_query);
            }).then(res => {
                response = res;
                return this.client.end();
            }).then(res => {
                return Promise.resolve("現在は、問題: " + response.rows[0].current_stage + " の解答時間です。");
            }).catch(err => {
                this.client.end();
                console.log("get_current_stage", err);
                return Promise.reject(new Error("申し訳ございません、メンテナンス中です。"));
            })
    }

 
    is_subscribe_correct_command(text){
        if ( text.match(this._subscrine_correct_regex) ){
            return true;
        }
        return false;
    }


    subscribe_correct(text){
        let correct = null
        let current_stage = null;
        return this.client.connect()
            .then(res => {
                //現在の設問番号を取得
                return this.client.query(this._get_currect_stage_query);
            }).then(res => {
                current_stage = res.rows[0].current_stage;
                correct = text.match(this._subscrine_correct_regex)[1];
                //正解を入力
                return this.client.query(
                    'insert into corrects (stage, correct) values($1, $2) returning *',
                    [
                        res.rows[0].current_stage,
                        correct
                    ])
            }).then(res => {
                this.client.end();
                return Promise.resolve("問題:" + current_stage + " の解答を、「" + correct + "」で入力しました。");
            }).catch(err => {
                this.client.end();
                return Promise.reject(new Error("正解入力失敗"));
 
            });
    }   
}

module.exports = QuizManager;
