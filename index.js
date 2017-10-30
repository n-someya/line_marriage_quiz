'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const QuizManager = require('./QuizManager')
const { Pool } = require('pg');
const pool = new Pool({
    max: 20,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 2000,
})
// create LINE SDK config from env variables
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

app.get('/answer_distribution/:q_number', (req, res) => {
    const q_number = req.params.q_number;
    const quiz_manager = new QuizManager(pool, client);
    quiz_manager.get_answer_distribution(q_number)
        .then(result => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.send(result);
        }).catch(err => {
            res.send(err);
        });
});

app.get('/ranking', (req, res) => {
    const quiz_manager = new QuizManager(pool, client);
    quiz_manager.get_current_ranking()
        .then(result => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.send(result);
        }).catch(err => {
            res.send(err);
        });
});


// event handler
function handleEvent(event) {
    if (event.type !== 'message') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    // 送信メッセージがテキストなら
    if (event.message.type == 'text'){
        const quiz_manager = new QuizManager(pool, client);
        // メッセージが回答候補なら
        if (quiz_manager.is_answer(event.message.text)) {

            // DBに回答を記載
            return quiz_manager.answer(event.source.userId, event.message.text)
                .then(message => {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: message
                    });
                })
            .catch(e => {
                //TODO If error has occured, shoud return sorry message
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: e.message
                });
            });

        } else if ( quiz_manager.is_subscribe_correct_command(event.message.text) ) {
            // 【管理系】DBに正解を記載
            return quiz_manager.subscribe_correct(event.message.text)
                .then(message => {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: message
                    });
                })
            .catch(e => {
                //TODO If error has occured, shoud return sorry message
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: e.message
                });
            });
        }else if ( quiz_manager.is_update_correct_command(event.message.text) ) {
            // 【管理系】DBの正解を更新
            return quiz_manager.update_correct(event.message.text)
                .then(message => {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: message
                    });
                })
            .catch(e => {
                //TODO If error has occured, shoud return sorry message
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: e.message
                });
            });
        }else if ( quiz_manager.is_get_current_ranking_command(event.message.text) ) {
            // 【管理系】現在のランキングを表示
            return quiz_manager.get_current_ranking()
                .then(response => {
                    let response_message = "";
                    for (let i=0; i<response.length; i++){
                        response_message += response[i].rank + "位 | " + response[i].display_name + "|" + response[i].cnt + "問正解 \n"
                    }
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: response_message
                    });
                })
            .catch(e => {
                //TODO If error has occured, shoud return sorry message
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: e.message
                });
            });
        }else if ( quiz_manager.is_get_current_number_of_corrects_command(event.message.text) ) {
            // 自分の正解数を表示
            return quiz_manager.get_current_number_of_corrects(event.source.userId)
                .then(message => {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: message
                    });
                })
            .catch(e => {
                //TODO If error has occured, shoud return sorry message
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: e.message
                });
            });
        }else {
            quiz_manager.get_current_stage()
                .then(message => {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: message
                    });
                })
            .catch(e => {
                //TODO If error has occured, shoud return sorry message
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: e.message
                });
            });
        }
    }else if (event.message.type == 'sticker'){
        return client.replyMessage(event.replyToken, {
            type: 'sitcker',
            packageId: '3',
            stickerId: '196'
        });
    }else{
        return Promise.resolve(null);
    }

    // ユーザ情報取得
    // client.getProfile(event.source.userId)
    //   .then((profile) => {

    // const text = event.message.text + "イカ？";
    // create a echoing text message
    // const echo = { type: 'text', text: text };
    // use reply API
    // return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
