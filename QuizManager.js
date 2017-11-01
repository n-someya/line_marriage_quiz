'use strict';

class QuizManager {

    constructor(pool, line_client) {
        this.pool = pool;
        // RegExp
        this._subscrine_correct_regex = new RegExp('^jy_correct ([1-4])$');
        this._update_correct_regex = new RegExp('^jy_correct ([0-9]+) ([1-4])$');
        this._get_currect_ranking_regex = new RegExp('^jy_ranking$');
        this._get_currect_number_of_corrects_regex = new RegExp('^結果.*$');

        // SQL Queries
        this._get_currect_stage_query = 'select coalesce((select max(stage) + 1 from corrects), 0) as current_stage;';
        this._get_currect_ranking_query = 
            "SELECT rank() over ( order by count(*) desc ), display_name, count(*) as cnt " +
            "FROM answers LEFT JOIN corrects USING (stage) LEFT JOIN users ON answers.user_id = users.id " +
            "WHERE answer = correct AND stage != 0 " + //stage=0は第０問なので結果集計から排除
            "GROUP BY user_id, display_name " +
            "ORDER BY cnt desc;";
        
        // Set getProfile function
        this.lineclient = line_client;
    }

    get_answer_distribution(question_number) {
        return this.pool.connect().then(client => {
            // 指定された問題の回答分布を取得
            return client.query('select answer, count(*) from answers where stage = $1 group by answer order by answer',
                [question_number]
            ).then(res => {
                client.release();
                let answer_distribution = [0,0,0,0];
                for( let i=0 ; i<res.rows.length; i++) {
                    answer_distribution[parseInt(res.rows[i].answer) - 1] = res.rows[i].count;
                }                
                return Promise.resolve(answer_distribution);
            }).catch(err => {
                client.release();
                console.log("get_current_stage", err);
                return Promise.reject(new Error("get answer distribution error."));
            });
        });
    }

    is_answer(text){
        // 半角、全角(\uff11が全角１)の1-4を許可
        let re = new RegExp('^[1-4|\uff11-\uff14]$');
        if ( text.match(re) ){
            return true;
        }
        return false;
    }

    _cleansing_answer_string(answer){
        let re_1 = new RegExp('^[1|\uff11]$');
        let re_2 = new RegExp('^[2|\uff12]$');
        let re_3 = new RegExp('^[3|\uff13]$');
        let re_4 = new RegExp('^[4|\uff14]$');
        if ( answer.match(re_1) ){
            return "1";
        }
        else if ( answer.match(re_2) ){
            return "2";
        }
        else if ( answer.match(re_3) ){
            return "3";
        }
        else if ( answer.match(re_4) ){
            return "4";
        }
        throw new Error("Invalid answer string");
    }

    answer(user_id, answer_string) {
        const answer = this._cleansing_answer_string(answer_string);
        return this.pool.connect().then(client => {
            //ユーザーテーブルの表示名が存在するか確認
            return client.query('SELECT * FROM users WHERE id = $1', [
                user_id
            ]).then(res => {
                //ユーザーテーブルの表示名が存在しなかった場合は、
                //解答処理とは非同期に取得APIを実行し、表示名をユーザーテーブルに格納する。
                if ( res.rows.length == 0){
                    this.lineclient.getProfile(user_id)
                    .then(profile=>{
                        client.query('INSERT INTO users VALUES($1, $2)',[
                            user_id,
                            profile.displayName
                        ]);
                    }).catch(e=>{
                        //getProfileに失敗しても何もしない。
                        console.log(e);
                    })
                }
                //現在の設問番号を取得
                return client.query(this._get_currect_stage_query)
            }).then(res => {
                //解答を入力
                return client.query(
                    'insert into answers (stage, user_id, answer) values($1, $2, $3) returning *',
                    [
                        res.rows[0].current_stage,
                        user_id,
                        answer
                    ]).catch(err => {
                        //再解答の場合の処理
                        //23505はUnique制約エラー ＝ すでに解答がされているのにINSERTしようとした
                        //その場合は解答をアップデート
                        if (err.code == 23505) {
                            return client.query(
                                'update answers set answer = $3 where stage = $1 and user_id = $2 returning *',
                                [
                                    res.rows[0].current_stage,
                                    user_id,
                                    answer
                                ]);
                        }
                        throw err;
                    });
            }).then(res => {
                client.release();
                let response_message = "解答を「" + answer + "」で受け付けました。";
                if (res.command === "UPDATE") {
                    response_message = "解答を「" + answer + "」で更新しました。"
                }
                return Promise.resolve(response_message);
            }).catch(err => {
                client.release();
                console.log("get_current_stage", err);
                return Promise.reject(new Error("申し訳ございません。回答を受け付けることができませんでした。再送してください。"));

            });
        });
    }


    get_current_stage() {
        let response = null;
        return this.pool.connect().then(client => {
            //現在の設問番号を取得
            return client.query(this._get_currect_stage_query)
                .then(res => {
                    response = res;
                    return client.release();
                }).then(res => {
                    return Promise.resolve("現在は、問題 " + response.rows[0].current_stage + " の解答時間です。");
                }).catch(err => {
                    client.release();
                    console.log("get_current_stage", err);
                    return Promise.reject(new Error("申し訳ございません、メンテナンス中です。"));
                });
        });
    }


    is_subscribe_correct_command(text) {
        if (text.match(this._subscrine_correct_regex)) {
            return true;
        }
        return false;
    }


    subscribe_correct(text) {
        let correct = null
        let current_stage = null;
        return this.pool.connect().then(client => {
            //現在の設問番号を取得
            return client.query(this._get_currect_stage_query)
                .then(res => {
                    current_stage = res.rows[0].current_stage;
                    correct = text.match(this._subscrine_correct_regex)[1];
                    //正解を入力
                    return client.query(
                        'insert into corrects (stage, correct) values($1, $2) returning *',
                        [
                            res.rows[0].current_stage,
                            correct
                        ])
                }).then(res => {
                    client.release();
                    return Promise.resolve("問題 " + current_stage + " の解答を、「" + correct + "」で入力しました。");
                }).catch(err => {
                    client.release();
                    return Promise.reject(new Error("正解入力失敗"));
                });
        });
    }


    is_update_correct_command(text) {
        if (text.match(this._update_correct_regex)) {
            return true;
        }
        return false;
    }


    update_correct(text) {
        let correct = null
        let current_stage = null;
        return this.pool.connect().then(client => {
            current_stage = text.match(this._update_correct_regex)[1];
            correct = text.match(this._update_correct_regex)[2];
            //正解を入力
            return client.query(
                'update corrects set correct = $2 where stage =  $1 returning *',
                [
                    current_stage,
                    correct
                ])
                .then(res => {
                    client.release();
                    return Promise.resolve("問題 " + current_stage + " の解答を、「" + correct + "」で更新しました。");
                }).catch(err => {
                    client.release();
                    return Promise.reject(new Error("正解更新失敗"));
                });
        });
    }


    is_get_current_ranking_command(text) {
        if (text.match(this._get_currect_ranking_regex)) {
            return true;
        }
        return false;
    }


    get_current_ranking() {
        let response = null;
        return this.pool.connect().then(client => {
            //現在の設問番号を取得
            return client.query(this._get_currect_ranking_query)
                .then(res => {
                    response = res;
                    return client.release();
                }).then(res => {
                    return Promise.resolve(response.rows);
                }).catch(err => {
                    client.release();
                    console.log("get_current_stage", err);
                    return Promise.reject(new Error("申し訳ございません、メンテナンス中です。"));
                });
        });
    }


    is_get_current_number_of_corrects_command(text) {
        if (text.match(this._get_currect_number_of_corrects_regex)) {
            return true;
        }
        return false;
    }


    get_current_number_of_corrects(user_id) {
        return this.pool.connect().then(client => {
            //現在の設問番号を取得
            let current_stage = null;
            let response = null;
            return client.query(this._get_currect_ranking_query)
                .then(res => {
                    current_stage = res.rows[0].current_stage;//stage=0は第０問なので結果集計から排除
                    return client.query('SELECT count(*) FROM answers LEFT JOIN corrects USING (stage) WHERE answer = correct AND user_id = $1 AND stage != 0',
                        [
                            user_id
                        ])
                        .then(res => {
                            response = res;
                            return client.release();
                        }).then(res => {
                            return Promise.resolve("あなたの正解数は現在、" + response.rows[0].count + "問です。");
                        }).catch(err => {
                            client.release();
                            console.log("get_current_stage", err);
                            return Promise.reject(new Error("申し訳ございません、メンテナンス中です。"));
                        });
                });
        });
    }

}

module.exports = QuizManager;
                