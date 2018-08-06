require('dotenv').config()

const express     = require('express'),
      bodyParser  = require('body-parser'),
      serveStatic = require('serve-static');

const Classifier = require('./classifier'); 

const app  = express(),
      port = process.env.PORT || 3002;

async function initialize() {
    const classifier = await Classifier.initialize();

    //Configure middlewares    
    app.use(bodyParser.json());
    app.use(serveStatic('./public'));
    app.use(function(err, req, res, next) {
        console.error('An error occured during express route execution: ', err);
        res.status(500).send(err.message);
    })

    //Configure routes
    app.get('/api/trainingData', async function(req, res, next) {
        try {
            res.send(await classifier.getTrainingData());
        }
        catch (err) {
            next(err);
        }
    });

    app.post('/api/trainingData', async function(req, res, next) {
        try {
            await classifier.setTrainingData(req.body);
            res.sendStatus(200);
        }
        catch (err) {
            next(err);
        }
    })

    app.get('/api/train', async function (req, res, next) {
        try {
            await classifier.train();
            res.sendStatus(200);
        }
        catch (err) {
            next(err);
        }
    });

    app.get('/api/predict/:text', async function(req, res, next) {
        try {
            res.send(await classifier.predict([req.params.text]));
        }
        catch (err) {
            next(err);
        }
    });

    //Initialize server
    app.listen(port, 'localhost', function () {
        console.log('Example app listening on port ' + port);
    });
}

initialize();  
