const QuizManager = require('../QuizManager.js')
const { Client } = require('pg');
const { Pool } = require('pg');
const fs = require('fs');

var assert = require('assert');
let chai = require('chai'), should = chai.should();

class DummyLineClient {
    getProfile(userId) {
        return new Promise((resolve, reject) => {
            resolve({ displayName: "Dummy User Name " + userId });
        });
    }
};

describe('QuizManager',function(){
    let quiz_manager = null;
    let pool = null;
    const test_user_id = 'test_user';
    before(function(done){
        process.env.PGUSER = "postgres"
        process.env.PGHOST = "localhost"
        process.env.PGPORT = 5432
        process.env.PGDATABASE = "postgres"
        let client = new Client();
        let sql = fs.readFileSync('./db/ddl.sql').toString();
        let dummy_line_client = new DummyLineClient();
        client.connect()
        .then(res => {
            return client.query(sql)
            .catch(e=>{
            })
        }).then(res =>{
            return client.query('delete from answers')
        }).then(res => {
            return client.query('delete from corrects')
        }).then(res => {
            return client.query('delete from users')
        }).then(res => {
            client.end();
            pool = new Pool({
                max: 20,
                idleTimeoutMillis: 15000,
                connectionTimeoutMillis: 1000,
            });
            quiz_manager = new QuizManager(pool, dummy_line_client);
            done();
        }).catch(err=>{
            client.end();
        })
    });

    after(function(done){
        pool.end().then(res=>{
            done();
        })
    })

    it('current_stage_test', function(done){
        quiz_manager.get_current_stage()
            .then(res => {
                assert.equal("現在は、問題 0 の解答時間です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('correctly_answer_first', function(done){
        quiz_manager.answer(test_user_id, "1")
            .then(res => {
                assert.equal("解答を「1」で受け付けました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });

    it('correctly_update_answer', function(done){
        quiz_manager.answer(test_user_id, "1")
            .then(res => {
                assert.equal("解答を「1」で更新しました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });

    it('1_is_answer', function(){
        assert(quiz_manager.is_answer("1"));
    });

    it("１_is_answer", function(){
        assert(quiz_manager.is_answer("１"));
    });

    it('4_is_answer', function(){
        assert(quiz_manager.is_answer("4"));
    });
    it('４_is_answer', function(){
        assert(quiz_manager.is_answer("４"));
    });

    it('11_is_not_answer', function(){
        assert.equal(quiz_manager.is_answer("11"), false);
    });

    it('valid_subscribe_command_1', function(){
        assert(quiz_manager.is_subscribe_correct_command("jy_correct 1"));
    });
 
    it('valid_subscribe_command_2', function(){
        assert(quiz_manager.is_subscribe_correct_command("jy_correct 2"));
    });

    it('invalid_subscribe_command_1', function(){
        assert.equal(quiz_manager.is_subscribe_correct_command("jy_correct x"), false);
    });

    it('correctly_subscribe_correct', function(done){
        quiz_manager.subscribe_correct("jy_correct 4")
            .then(res => {
                assert.equal("問題 0 の解答を、「4」で入力しました。", res);
                done();
            })
            .catch(err =>{
                done(err);
            });
    });

    it('correctly_answer_1st_question', function(done){
        quiz_manager.answer(test_user_id, "4")
            .then(res => {
                assert.equal("解答を「4」で受け付けました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });


    it('correctly_subscribe_correct_1', function(done){
        quiz_manager.subscribe_correct("jy_correct 4")
            .then(res => {
                assert.equal("問題 1 の解答を、「4」で入力しました。", res);
                done();
            })
            .catch(err =>{
                done(err);
            });
    });

    it('invalid_subscribe_correct', function(done){
        quiz_manager.subscribe_correct("jy_correct X")
            .catch(err =>{
                assert.equal(err.message, "正解入力失敗");
                done();
            });
    });

    it('correctly_update_correct', function(done){
        quiz_manager.update_correct("jy_correct 0 1")
            .then(res => {
                assert.equal("問題 0 の解答を、「1」で更新しました。", res);
                done();
            })
            .catch(err =>{
                done(err);
            });
    });


    it('increment current_stage', function(done){
        quiz_manager.get_current_stage()
            .then(res => {
                assert.equal("現在は、問題 2 の解答時間です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('get_answer_distribution', function(done) {
        let client = new Client();
        client.connect()
        .then(res => {
            return client.query("insert into answers (stage, user_id, answer) values (2, 'user1', '1'), (2, 'user2', '1'), (2, 'user3', '2'), (3, 'user4', '4')");
        }).then(res => {
            client.end();
            return quiz_manager.get_answer_distribution(2);
        }).then(res => {
            const correct_obj = [2,1,0,0];
            assert.deepEqual(correct_obj, res);
            done();
        }).catch(err => {
            client.end();
            done(err);
        });
    });

    it('valid_get_current_ranking_comand', function(){
        assert(quiz_manager.is_get_current_ranking_command("jy_ranking"));
    });

    it('invalid_get_current_ranking_comand', function(){
        assert.equal(quiz_manager.is_get_current_ranking_command("jyranking"), false);
    });

    it('get current_ranking', function(done){
        quiz_manager.get_current_ranking()
            .then(res => {
                chai.assert.property(res[0], 'display_name');
                chai.assert.property(res[0], 'rank');
                chai.assert.property(res[0], 'cnt');
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('valid_get_current_number_of_corrects_comand', function(){
        assert(quiz_manager.is_get_current_number_of_corrects_command("結果は？"));
    });

    it('valid_get_current_number_of_corrects_comand_2', function(){
        assert(quiz_manager.is_get_current_number_of_corrects_command("結果"));
    });


    it('get current_number_of_my_corrects', function (done) {
        quiz_manager.get_current_number_of_corrects(test_user_id)
            .then(res => {
                chai.assert.typeOf(res, 'string');
                assert.equal("あなたの正解数は現在、1問です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });
 
});
