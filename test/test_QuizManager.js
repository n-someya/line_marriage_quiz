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
                assert.equal("現在は、問題: 0 の解答時間です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('correctly_answer_first', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.answer("test_user", "A")
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
        const quiz_manager = new QuizManager();
        quiz_manager.answer("test_user", "A")
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

    it("ａ_is_answer", function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("ａ"));
    });
    
    it('d_is_answer', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("d"));
    });
    it('D_is_answer', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("D"));
    });

    it("Ｄ_is_answer", function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("Ｄ"));
    });

    it("ｄ_is_answer", function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_answer("ｄ"));
    });

    it('aa_is_not_answer', function(){
        const quiz_manager = new QuizManager();
        assert.equal(quiz_manager.is_answer("aa"), false);
    });

    it('valid_subscribe_command_1', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_subscribe_correct_command("juta_yuki_correct A"));
    });
 
    it('valid_subscribe_command_2', function(){
        const quiz_manager = new QuizManager();
        assert(quiz_manager.is_subscribe_correct_command("juta_yuki_correct D"));
    });

    it('invalid_subscribe_command_1', function(){
        const quiz_manager = new QuizManager();
        assert.equal(quiz_manager.is_subscribe_correct_command("juta_yuki_correct x"), false);
    });

    it('correctly_subscribe_correct', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.subscribe_correct("juta_yuki_correct A")
            .then(res => {
                assert.equal("問題:0 の解答を、「A」で入力しました。", res);
                done();
            })
            .catch(err =>{
                done(err);
            });
    });

    it('invalid_subscribe_correct', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.subscribe_correct("juta_yuki_correct X")
            .catch(err =>{
                assert.equal(err.message, "正解入力失敗");
                done();
            });
    });


    it('increment current_stage', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.get_current_stage()
            .then(res => {
                assert.equal("現在は、問題: 1 の解答時間です。", res);
                done();
            }).catch(err => {
                done(err);
            });
    });

    it('get_answer_distribution', function(done) {
        const quiz_manager = new QuizManager();
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
});
