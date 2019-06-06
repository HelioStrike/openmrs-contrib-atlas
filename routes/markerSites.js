var express = require('express');
var router = express.Router();
var uuid = require('uuid');

module.exports = function(connection) {
    /* Middleware to check whether the user is logged in */
    function isAuthenticated(req, res, next) {
        if(req.session.authenticated) {
            return next();
        } else {
            res.redirect("/login");
        }
    };

    function filterMarkerIds(req, markers) {
        for(var i = 0; i < markers.length; i++) {
            //If user not is signed in or authenticated user is not the creator of a marker
            //then hide the marker's id
            if(req.session.user == null || markers[i].created_by != req.session.user.uid) markers[i].id = i;
        }
    }

    /* GET all the markerSites */
    router.get('/markerSites', function(req, res, next) {

        connection.query("SELECT * FROM atlas", function (error, rows, field) {
            if(!!error){
                console.log(error);
            }
            else{
                //var data  = JSON.stringify(rows);
                res.setHeader('Content-Type', 'application/json');
                filterMarkerIds(req, rows);
                res.json(rows);
            }
        });

    });

    /* Get a specific marker with uid parameter */
    router.get('/marker/uid/:uid', function (req, res, next) {

        var uid=req.params['uid'];
        console.log(uid);
        connection.query('select * from atlas where created_by=?',[uid], function (error, rows, field) {

            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                filterMarkerIds(req, rows);
                res.json(rows);
                //connection.end();
            }
        })
    });

    /* Get a specific marker with uid parameter */
    router.get('/marker/:id', function (req, res, next) {

        var id=req.params['id'];
        console.log(id);
        connection.query('select * from atlas where id=?',[id], function (error, rows, field) {

            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                filterMarkerIds(req, rows);
                res.json(rows);
                //connection.end();
            }
        })
    });

    /* Get markers based on type, openmrs_version and distribution */
    router.get('/markers', function (req, res, next) {

        var types=req.query['type'];
        var versions=req.query['versions'];
        var dists=req.query['dists'];
        //console.log(types+versions+dists);
        connection.query('select * from atlas where type=? and openmrs_version=? and distribution=?',[types,versions,dists], function (error, rows, field) {

            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                filterMarkerIds(req, rows);
                res.json(rows);
                //connection.end();
            }
        })
    });

    /* Create new marker */
    router.post('/marker/', isAuthenticated, function (req, res, next) {
        req.body = JSON.parse(Object.keys(req.body)[0]);
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
        var atlas_verison=req.body.atlas_version;
        var date_created= new Date().toISOString().slice(0, 19).replace('T', ' ');
        var date_changed=new Date().toISOString().slice(0, 19).replace('T', ' ');
        var created_by=req.body.uid;
        var show_counts=req.body.show_counts;
        var openmrs_version=req.body.openmrs_version?req.body.openmrs_version:"unknown";
        var distribution=req.body.distribution;

        console.log(id+"    "+latitude+longitude+name+url+type+image+patients+encounters+date_changed+"           "+date_created);

        connection.query('insert into atlas values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [id,latitude,longitude,name,url,type,image,patients,encounters,observations,contact,email,notes,data,atlas_verison,date_created,date_changed,created_by,show_counts,openmrs_version,distribution], function (error, rows,field) {
            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(id);
            }
        });
    });

    /* Update marker with given id */
    router.post('/marker/:id', isAuthenticated, function (req, res, next) {
        req.body = JSON.parse(Object.keys(req.body)[0]);
        var id=req.params['id'];
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
        var atlas_verison=req.body.atlas_version;
        var date_created= new Date().toISOString().slice(0, 19).replace('T', ' ');
        var date_changed=new Date().toISOString().slice(0, 19).replace('T', ' ');
        var created_by=req.body.uid;
        var show_counts=req.body.show_counts;
        var openmrs_version=req.body.openmrs_version?req.body.openmrs_version:"unknown";
        var distribution=req.body.distribution;

        console.log(id+"    "+latitude+longitude+name+url+type+image+patients+encounters+date_changed+"           "+date_created);

        connection.query('UPDATE atlas SET latitude=?,longitude=?,name=?,url=?,type=?,image=?,patients=?,encounters=?,observations=?,contact=?,email=?,notes=?,data=?,atlas_version=?,date_created=?,date_changed=?,created_by=?,show_counts=?,openmrs_version=?,distribution=? WHERE id =? AND created_by=?', [latitude,longitude,name,url,type,image,patients,encounters,observations,contact,email,notes,data,atlas_verison,date_created,date_changed,created_by,show_counts,openmrs_version,distribution,id,req.session.user.uid], function (error, rows,field) {
            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(id);
            }
        });
    });

    /* Update marker with given id (called by atlas module) */
    router.post('/module/ping.php', isAuthenticated, function (req, res, next) {
        console.log(req.body);
        var id=req.body.id;
        var patients=req.body.patients;
        var encounters=req.body.encounters;
        var observations=req.body.observations;
        var data=req.body.data;
        var atlas_verison=req.body.atlas_version;
        var date_changed=new Date().toISOString().slice(0, 19).replace('T', ' ');
        var openmrs_version=data.version;

        connection.query('UPDATE atlas SET patients=?,encounters=?,observations=?,data=?,atlas_version=?,date_changed=?,openmrs_version=? WHERE id =?', [patients,encounters,observations,data,atlas_verison,date_changed,openmrs_version,id], function (error, rows,field) {
            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(id);
            }
        });
    });

    /* Delete marker with given id */
    router.delete('/marker/:id', isAuthenticated, function(req, res, next) {

        var id=req.params['id'];

        connection.query('DELETE FROM atlas WHERE id =? AND created_by=?', [id, req.session.user.uid], function (error, rows,field) {
            if(!!error){
                console.log(error);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.json(id);
            }
        });
    });

    /* Delete marker with given id (called by atlas module) */
    router.delete('/module', isAuthenticated, function(req, res, next) {

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
