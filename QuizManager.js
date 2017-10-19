'use strict';
const { Client } = require('pg');

class QuizManager {

    constructor() {
        this.client = new Client();
    }


    is_answer(text){
        // 半角大文字小文字、全角大文字小文字(\uff21が全角A)のa-dを許可
        let re = new RegExp('[a-d|A-D|\uff21-\uff24|\uff41-\uff44j]');
        if ( text.match(re) ){
            return true;
        }
        return false;
    }

    answer(user_name, answer) {
        return this.client.connect()
            .then(res => {
            //現在の設問番号を取得
                return this.client.query('select coalesce((select max(stage)  from corrects), 0) as current_stage;')
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
                let response_message = "解答を受け付けました。";
                if (res.command === "UPDATE") {
                    response_message = "解答を更新しました。"
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
                return this.client.query('select coalesce((select max(stage)  from corrects), 0) as current_stage;')
            }).then(res => {
                response = res;
                return this.client.end();
            }).then(res => {
                return Promise.resolve("現在の問題番号は " + response.rows[0].current_stage + " です。");
            }).catch(err => {
                this.client.end();
                console.log("get_current_stage", err);
                return Promise.reject(new Error("申し訳ございません、メンテナンス中です。"));
            })
    }
}

module.exports = QuizManager;
