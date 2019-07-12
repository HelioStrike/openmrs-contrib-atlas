var express = require('express');
var router = express.Router();
var uuid = require('uuid');
var utils = require('../utils.js');
var stream = require('stream');
var { Parser } = require('json2csv');

module.exports = function(connection) {

    var recently_seen = [];
    const ATLAS_LINK = process.env.ATLAS_RSS_LINK || 'https://atlas.openmrs.org';

    setInterval(function() {
        while(recently_seen.length && new Date() - recently_seen[0][1] > 5*60*1000) {
            recently_seen.shift();
        }
    }, 60 * 1000);

    function checkAndAddRSS(title, description, url, image_url, created_by) {
        if(typeof recently_seen.find(function(row) { return row[0] === title; }) === "undefined") {
            recently_seen.push([title, new Date()]);
            utils.addRSS(connection,title,description,url,image_url,created_by);
        }

    }

    var show_counts_query = "SELECT * FROM atlas";

    var no_counts_query = "SELECT id,latitude,longitude,name,url,type,image,show_counts, \
    IF(show_counts, patients, null) AS patients, \
    IF(show_counts, encounters, null) AS encounters, \
    IF(show_counts, observations, null) as observations, \
    contact,email,notes,data,atlas_version,openmrs_version,distribution,date_created,date_changed,created_by FROM atlas";

    /* GET all the markers */
    router.get('/markers', function(req, res, next) {

        var query = "";
        if(req.session.authenticated && req.session.user.admin) query = show_counts_query;
        else query = no_counts_query;

        //filter by url
        var criteria = [
            {
                param: 'username',
                col: 'created_by',
            },
            {
                param: 'type',
                col: 'type',
            },
            {
                param: 'versions',
                col: 'openmrs_version',
            },
            {
                param: 'dists',
                col: 'distribution',
            },
        ]

        //if parameter exists in the url
        //push it into params, and add column name to sql query
        var params = [];
        criteria.forEach(function(crit) {
            if(req.query[crit.param]) {
                query += (params.length === 0? ' WHERE ':' AND ')+crit.col+"=?";
                params.push(req.query[crit.param]);
            }
        });

        connection.query(query, params, function (error, rows, field) {
            if(!!error){
                console.log(error);
            }
            else{
                res.setHeader('Content-Type', 'application/json');
                res.json(rows);
            }
        });

    });

    /* GET all the markers */
    router.get('/markers/download', utils.isAdmin, function(req, res, next) {

        var query = "SELECT atlas.id as id,latitude,longitude,atlas.name as site_name,url,type,image,patients,encounters,observations,contact,email,notes,data,atlas_version,date_created,date_changed,created_by,show_counts,openmrs_version,distributions.name as distribution FROM atlas LEFT JOIN distributions on atlas.distribution=distributions.id";

        connection.query(query, function (error, rows, field) {
            if(!!error){
                console.log(error);
            }
            else{
                var fields = ['id','latitude','longitude','site_name','url','type','image','show_counts','patients','encounters','observations','contact','email','notes','data','atlas_version','openmrs_version','distribution','date_created','date_changed','created_by'];
                var opts = { fields };
                                
                try {
                    const parser = new Parser(opts);
                    const csv = parser.parse(rows);

                    var fileName = 'atlas.csv';

                    var readStream = new stream.PassThrough();
                    readStream.end(csv);
                  
                    res.set('Content-disposition', 'attachment; filename=' + fileName);
                    res.set('Content-Type', 'text/plain');
                  
                    readStream.pipe(res);

                } catch (err) {
                    console.error(err);
                }
            }
        });

    });

    /* Get a specific marker with id parameter */
    router.get('/marker/:id', function (req, res, next) {

        var query = "";
        if(req.session.authenticated && req.session.user.isAdmin) query = show_counts_query;
        else query = no_counts_query;

        var id=req.params['id'];
        connection.query(query+' where id=?',[id], function (error, rows, field) {

            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(rows);
            }
        })
    });

    /* Create new marker */
    router.post('/marker/', utils.isAuthenticated, function (req, res, next) {

        //If authenticated user is not the owner of the marker or an admin, return 401 (Unauthorized)
        if(req.session.user.uid != req.body.created_by && !req.session.user.admin) return res.send(401);

        var id=uuid.v4();
        var latitude=req.body.latitude;
        var longitude=req.body.longitude;
        var name=req.body.name;
        var url=req.body.url;
        var type=req.body.type;
        var image=req.body.image;
        var patients=req.body.patients;
        var encounters=req.body.encounters;
        var observations=req.body.observations;
        var contact=req.body.contact;
        var email=req.body.email;
        var notes=req.body.notes;
        var data=req.body.data;
        var atlas_version=null;
        var date_created= new Date();
        var date_changed=new Date();
        var created_by=req.session.user.uid;
        var show_counts=req.body.show_counts;
        var openmrs_version=req.body.openmrs_version?req.body.openmrs_version:"Unknown";
        var distribution=req.body.distribution;

        console.log(data);

        connection.query('insert into atlas values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [id,latitude,longitude,name,url,type,image,patients,encounters,observations,contact,email,notes,data,atlas_version,date_created.toISOString().slice(0, 19).replace('T', ' '),date_changed.toISOString().slice(0, 19).replace('T', ' '),created_by,show_counts,openmrs_version,distribution], function (error, rows,field) {
            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                var json = req.body;
                json['id'] = id;
                json['date_created'] = date_created;
                json['date_changed'] = date_changed;
                json['created_by'] = created_by;
                json['openmrs_version'] = openmrs_version;
                res.json(json);
                checkAndAddRSS(`${name} joins the OpenMRS Atlas`, `${req.session.user.uid} added ${name} as a new site on the OpenMRS Atlas`, ATLAS_LINK + "/?marker=" + id, image, req.session.user.uid);
            }
        });
    });

    /* Update marker with given id */
    router.patch('/marker/:id', utils.isAuthenticated, function (req, res, next) {

        var id = req.params['id']

        connection.query("SELECT * FROM atlas WHERE id=?", [id], function (error, rows, field) {
            if(error) {
                console.log(error);
                return res.status(500).send({ message: "Error retrieving data from database"});
            }
            else if(!rows || rows.length === 0) {
                return res.status(404).send({ message: "Marker not found"});
            }
            else if(rows[0].created_by != req.session.user.uid && !req.session.user.admin) {
                return res.send(401);
            } else {
                var data = rows[0];

                if(req.body !== null && !Object.keys(req.body).length) {
                    data.date_changed=new Date();
                    var query = 'UPDATE atlas SET date_changed=? WHERE id =?';
                    if(!req.session.user.admin) {
                        query += ' AND created_by=\''+req.session.user.uid+'\'';
                    }

                    console.log(data);

                    connection.query(query, [data.date_changed.toISOString().slice(0, 19).replace('T', ' '),id], function (error, rows,field) {
                        if(!!error){
                            console.log(error);
                        } else {
                            res.setHeader('Content-Type', 'application/json');
                            res.json(data);
                            checkAndAddRSS(`${data.name} refreshed`, `The OpenMRS Atlas received a ping from ${data.name}`, ATLAS_LINK + "/?marker=" + id, data.image, req.session.user.uid);
                        }
                    });            
          

                } else {
                    //If authenticated user is not the owner of the marker or an admin, return 401 (Unauthorized)
                    if(req.session.user.uid != req.body.created_by && !req.session.user.admin) return res.send(401);

                    data.latitude=req.body.latitude;
                    data.longitude=req.body.longitude;
                    data.name=req.body.name;
                    data.url=req.body.url;
                    data.type=req.body.type;
                    data.image=req.body.image;
                    data.patients=req.body.patients;
                    data.encounters=req.body.encounters;
                    data.observations=req.body.observations;
                    data.contact=req.body.contact;
                    data.email=req.body.email;
                    data.notes=req.body.notes;
                    data.data=req.body.data;
                    data.date_changed=new Date();
                    data.show_counts=req.body.show_counts;
                    data.openmrs_version=req.body.openmrs_version?req.body.openmrs_version:"unknown";
                    data.distribution=req.body.distribution;
                    var query = 'UPDATE atlas SET latitude=?,longitude=?,name=?,url=?,type=?,image=?,patients=?,encounters=?,observations=?,contact=?,email=?,notes=?,data=?,atlas_version=?,date_changed=?,show_counts=?,openmrs_version=?,distribution=? WHERE id =?';
                    // If the user is not admin, we have to check whether the marker belongs to the user
                    if(!req.session.user.admin) {
                        query += ' AND created_by=\''+req.session.user.uid+'\'';
                    }

                    console.log(data);

                    connection.query(query, [data.latitude,data.longitude,data.name,data.url,data.type,data.image,data.patients,data.encounters,data.observations,data.contact,data.email,data.notes,data.data,data.atlas_verison,data.date_changed.toISOString().slice(0, 19).replace('T', ' '),data.show_counts,data.openmrs_version,data.distribution,data.id], function (error, rows,field) {
                        if(!!error){
                            console.log(error);
                        }
                        else {
                            res.setHeader('Content-Type', 'application/json');                    
                            res.json(data);        
                            checkAndAddRSS(`${data.name} entry updated`, `${req.session.user.uid} made changes to ${data.name} on the OpenMRS Atlas`, ATLAS_LINK + "/?marker=" + id, data.image, req.session.user.uid);
                        }
                    });
                }
            }
        });
        
    });

    /* Update marker with given id (called by atlas module) */
    router.post('/module/ping.php', utils.isAuthenticated, function (req, res, next) {
        console.log(req.body);
        var id=req.body.id;
        var patients=req.body.patients;
        var encounters=req.body.encounters;
        var observations=req.body.observations;
        var data=req.body.data;
        var atlas_version=req.body.atlas_version;
        var date_changed=new Date().toISOString().slice(0, 19).replace('T', ' ');
        var openmrs_version=data.version;

        connection.query('SELECT * FROM atlas_versions WHERE version=', [atlas_version], function (error, rows,field) {
            if(!!error){
                console.log(error);
            } else {
                
                if(!rows.length) atlas_version = null;

                connection.query('UPDATE atlas SET patients=?,encounters=?,observations=?,data=?,atlas_version=?,date_changed=?,openmrs_version=? WHERE id =?', [patients,encounters,observations,data,atlas_version,date_changed,openmrs_version,id], function (error, rows,field) {
                    if(!!error){
                        console.log(error);
                    }
                    else {
                        res.setHeader('Content-Type', 'application/json');
                        res.json(id);
                    }
                });
            }
        });
    });

    /* Delete marker with given id */
    router.delete('/marker/:id', utils.isAuthenticated, function(req, res, next) {

        var id=req.params['id'];

        connection.query("SELECT * FROM atlas WHERE id=?", [id], function (error, rows, field) {

            if(error) {
                console.log(error);
                return res.status(500).send({ message: "Error retrieving data from database"});
            } else if (!rows || rows.length === 0) {
                return res.status(404).send({ message: "Marker not found"});
            } else if (rows[0].created_by != req.session.user.uid && !req.session.user.admin) {
                res.send(401);
            } else {
                var data = rows[0];

                // If the user is not admin, we have to check whether the marker belongs to the user
                var query = 'DELETE FROM atlas WHERE id =?';
                if(!req.session.user.admin) {
                    query += ' AND created_by=\''+req.session.user.uid+'\'';
                }

                connection.query(query, [id], function (error, rows,field) {
                    if(!!error){
                        console.log(error);
                    }
                    else {
                        res.setHeader('Content-Type', 'application/json');
                        res.json(data);
                        checkAndAddRSS(`OpenMRS Atlas bids farewell to ${data.name}`, `${req.session.user.uid} removed ${data.name} from the OpenMRS Atlas.`, ATLAS_LINK, null, req.session.user.uid);
                    }
                });
            }
        });
    });

    /* Delete marker with given id (called by atlas module) */
    router.delete('/module', utils.isAuthenticated, function(req, res, next) {

        var id=req.query['id'];
        var secret=req.query['secret'];

        connection.query('DELETE FROM atlas WHERE id =?', [id], function (error, rows,field) {
            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(id);
            }
        });
    });
    
    return router;
};
