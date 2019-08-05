var express = require('express');
var router = express.Router();
var utils = require('../../utils.js');
var ldapUtils = require('../../ldap.js');

module.exports = function(connection) {

    /* Get all auth rules */
    router.get('/auth', function (req, res, next) {

        connection.query('select * from auth', function (error, rows, field) {

            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(rows);
            }
        })
    });
    
    /* Create new auth rule */
    router.post('/auth', utils.isAuthenticated, function (req, res, next) {
        var atlas_id=req.body.atlas_id;

        var principal=req.body.principal;

        if(atlas_id.trim() === '' || principal.trim() === '') {
            return res.send(400);
        }

        connection.query('SELECT * FROM atlas WHERE id=?', [atlas_id], function (error, rows, field) {
            if(!!error){
                console.log(error);
            } else if(rows[0].created_by == req.session.user.uid || req.session.user.admin) {

                ldapUtils.getUser(principal, function(error, user) {

                    if(error) {
                        console.log(error);
                    } else if (user) {
                        var token=req.body.token;
                        if(token) {
                            token = utils.hashToken(token);
                        }
                        var privileges=req.body.privileges;
                        var expires=req.body.expires;
                        connection.query('INSERT INTO auth(atlas_id,principal,token,privileges,expires) VALUES(?,?,?,?,?)', [atlas_id,principal,token,privileges,expires], function (error, rows, field) {
                            if(!!error){
                                console.log(error);
                            } else {
                                res.setHeader('Content-Type', 'application/json');
                                var json = req.body;
                                json.id = rows.insertId;
                                res.json(json);
                            }
                        });        
                    } else {
                        res.status(400).send({ message: principal + ' not found' });
                    }
                }); 
            } else {
                res.send(401);
            }
        });
    });

    /* Delete auth rule with given id */
    router.delete('/auth/:id', utils.isAuthenticated, function(req, res, next) {

        var id=req.params['id'];

        if(id.trim() === '') {
            return res.send(400);
        }

        connection.query("SELECT * FROM auth WHERE id=?", [id], function (error, rows, field) {

            if(error) {
                console.log(error);
                return res.status(500).send({ message: "Error retrieving data from database"});
            } else {
                var data = rows[0];

                connection.query("SELECT created_by FROM atlas WHERE id=?", [data.atlas_id], function (error, rows, field) {

                    if(error) {
                        console.log(error);
                        return res.status(500).send({ message: "Error retrieving data from database"});
                    } else if (rows[0].created_by === req.session.user.uid || req.session.user.admin) {
                        connection.query("DELETE FROM auth WHERE id=?", [id], function (error, rows,field) {
                            if(!!error){
                                console.log(error);
                            } else {
                                res.setHeader('Content-Type', 'application/json');
                                res.json(data);
                            }
                        });
                    } else {
                        res.send(401);
                    }
                });
            }
        });
    });

    return router;
};