const QuizManager = require('../QuizManager.js')
const { Client } = require('pg');

var assert = require('assert');
let chai = require('chai'), should = chai.should();

describe('QuizManager',function(){
    before(function(done){
        process.env.PGUSER = "postgres"
        process.env.PGHOST = "localhost"
        process.env.PGPORT = 5432
        process.env.PGDATABASE = "postgres"
        let client = new Client();
        client.connect()
        .then(res => {
            return client.query('delete from answers')
        }).then(res => {
            return client.query('delete from corrects')
        }).then(res => {
            client.end();
            done();
        }).catch(err=>{
            client.end();
        })
    });

    it('current_stage_test', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.get_current_stage()
            .then(res => {
                assert.equal("現在の問題番号は 0 です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('correctly_answer_first', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.answer("test_user", "A")
            .then(res => {
                assert.equal("解答を受け付けました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });

    it('correctly_update_answer', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.answer("test_user", "A")
            .then(res => {
                assert.equal("解答を更新しました。", res);
                done();
            })
            .catch(err =>{
                console.log("err", err.code);
                done(err);
            });
    });

    it('a_is_answer', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("a"));
    });


    it('A_is_answer', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("A"));
    });

    it("Ａ_is_answer", function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("Ａ"));
    });
    
    it('d_is_answer', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("d"));
    });
    it('D_is_answer', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("D"));
    });

    it("_is_answer", function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("Ａ"));
    });
});
