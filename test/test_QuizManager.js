const QuizManager = require('../QuizManager.js')

var assert = require('assert');
let chai = require('chai'), should = chai.should();

describe('QuizManager',function(){
    before(function(done){
        process.env.PGUSER = "postgres"
        process.env.PGHOST = "localhost"
        process.env.PGPORT = 5432
        process.env.PGDATABASE = "postgres"
        done();
    });

    it('current_stage_test', function(done){
        const quiz_manager = new QuizManager();
        quiz_manager.get_current_stage()
            .then(res => {
                console.log(res);
                done();
            })
            .catch(e =>{
                done();
            });
    });

});
