require('dotenv').config()

const express     = require('express'),
      bodyParser  = require('body-parser')

//load modules
const Classifier = require('./classifier');

const app     = express(),
      port    = process.env.PORT || 3002;

async function initialize() {
    const classifier = await Classifier.initialize();

    //Configure middlewares    
    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json());
    app.use(express.static('public'));
    app.use(function(err, req, res, next) {
        console.error('An error occured during express route execution: ', err);
        res.status(500).send(err.message);
    });

    //Configure routes
    app.get('/', (req, res) => res.redirect('/list'));

    app.get('/list', require('./routes/definition.list.route'));

    app.post('/create', require('./routes/definition.create.route'));

    app.post('/edit', require('./routes/definition.edit.route'));

    app.post('/remove', require('./routes/definition.remove.route'));

    //API
    app.get('/api/predict/:text', async function(req, res, next) {
        try {
            res.send(await classifier.predict(req.params.text));
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
