const QuizManager = require('../QuizManager.js')
const { Client } = require('pg');
const { Pool } = require('pg');
const fs = require('fs');

var assert = require('assert');
let chai = require('chai'), should = chai.should();

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
            client.end();
            pool = new Pool({
                max: 20,
                idleTimeoutMillis: 15000,
                connectionTimeoutMillis: 1000,
            });
            quiz_manager = new QuizManager(pool);
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
                assert.equal("現在は、問題: 0 の解答時間です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('correctly_answer_first', function(done){
        quiz_manager.answer(test_user_id, "A")
            .then(res => {
                assert.equal("解答を「A」で受け付けました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });

    it('correctly_update_answer', function(done){
        quiz_manager.answer(test_user_id, "A")
            .then(res => {
                assert.equal("解答を「A」で更新しました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });

    it('a_is_answer', function(){
        assert(quiz_manager.is_answer("a"));
    });


    it('A_is_answer', function(){
        assert(quiz_manager.is_answer("A"));
    });

    it("Ａ_is_answer", function(){
        assert(quiz_manager.is_answer("Ａ"));
    });

    it("ａ_is_answer", function(){
        assert(quiz_manager.is_answer("ａ"));
    });
    
    it('d_is_answer', function(){
        assert(quiz_manager.is_answer("d"));
    });
    it('D_is_answer', function(){
        assert(quiz_manager.is_answer("D"));
    });

    it("Ｄ_is_answer", function(){
        assert(quiz_manager.is_answer("Ｄ"));
    });

    it("ｄ_is_answer", function(){
        assert(quiz_manager.is_answer("ｄ"));
    });

    it('aa_is_not_answer', function(){
        assert.equal(quiz_manager.is_answer("aa"), false);
    });

    it('valid_subscribe_command_1', function(){
        assert(quiz_manager.is_subscribe_correct_command("jy_correct A"));
    });
 
    it('valid_subscribe_command_2', function(){
        assert(quiz_manager.is_subscribe_correct_command("jy_correct D"));
    });

    it('invalid_subscribe_command_1', function(){
        assert.equal(quiz_manager.is_subscribe_correct_command("jy_correct x"), false);
    });

    it('correctly_subscribe_correct', function(done){
        quiz_manager.subscribe_correct("jy_correct D")
            .then(res => {
                assert.equal("問題:0 の解答を、「D」で入力しました。", res);
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
        quiz_manager.update_correct("jy_correct 0 A")
            .then(res => {
                assert.equal("問題:0 の解答を、「A」で更新しました。", res);
                done();
            })
            .catch(err =>{
                done(err);
            });
    });


    it('increment current_stage', function(done){
        quiz_manager.get_current_stage()
            .then(res => {
                assert.equal("現在は、問題: 1 の解答時間です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('get_answer_distribution', function(done) {
        let client = new Client();
        client.connect()
        .then(res => {
            return client.query("insert into answers (stage, user_id, answer) values (1, 'user1', 'A'), (1, 'user2', 'A'), (1, 'user3', 'B'), (2, 'user4', 'D')");
        }).then(res => {
            client.end();
            return quiz_manager.get_answer_distribution(1);
        }).then(res => {
            const correct_obj = { A: '2', B: '1', C: '0', D: '0' };
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
                //TODO
                chai.assert.typeOf(res, 'string');
                console.log(res)
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
