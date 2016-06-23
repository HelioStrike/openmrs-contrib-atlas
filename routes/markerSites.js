var express = require('express');
var router = express.Router();
var mysql      = require('mysql');

// set the mysql properties
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'atlas'
});

//get the conncetion
connection.connect(function (error) {
    if(!!error){
        console.log('Error');
    }else{
        console.log('connected');
    }
});

/* GET all the markerSites */
router.get('/markerSites', function(req, res, next) {
    
    connection.query("SELECT * FROM atlas", function (error, rows, field) {
        if(!!error){
            console.log(error);
        }
        else{
            //var data  = JSON.stringify(rows);
            res.setHeader('Content-Type', 'application/json');
            res.json(rows);
           // console.log('it is executing');
            //connection.end();
            //console.log(JSON.stringify(rows));
        }
    });
    
    //jus for now, i should change this later
    //res.render('index', { title: 'OpenMRS Atlas' });

});

/*Get a specific marker with uid parameter*/
router.get('/marker/:id', function (req, res, next) {
    
    var id=req.params['id'];
    connection.query('select * from atlas where id=?',[id], function (error, rows, field) {

        if(!!error){
            console.log(error);
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.json(rows);
            //connection.end();
        }
    })
});

router.get('markers?types=:types&versions=:versions&dists=:dists', function (req, res, next) {

    var id=req.params['id'];
    connection.query('select * from we where sid=?',[id], function (error, rows, field) {

        if(!!error){
            console.log(error);
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.json(rows);
            //connection.end();
        }
    })
});


//close the connection
//connection.end();

module.exports = router;