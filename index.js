'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const QuizManager = require('./QuizManager')

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

// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  const quiz_manager = new QuizManager();
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
