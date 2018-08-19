const fs          = require('fs'),
      {promisify} = require('util'),
      config      = require('config'),
      FastText    = require('fasttext.js'),      
      miss        = require('mississippi');

const db = require('../db');

const unlinkAsync    = promisify(fs.unlink),
      existsAsync    = promisify(fs.exists),
      statAsync      = promisify(fs.stat),
      mkdirAsync     = promisify(fs.mkdir);

const paths    = config.get('Path')
      training = config.get('Training');

const trainingInterval = config.get('Timers.trainingInterval');

const fastText = new FastText({
	bin: process.env.FASTTEXT_PATH,
    serializeTo: paths.trainedData,
	loadModel: paths.trainedData + '.bin',
    trainFile: paths.pretrainedData,
	train: training
});

var knownTexts = [], modifiedStamp;

const functions = {

    prepareTrainingData: () => new Promise((resolve, reject) => {
        let entries = 0;
        let readDb = db.read(),
            transform = miss.through.obj(
                (chunk, enc, cb) => {
                    entries += chunk.length;
                    cb(null, chunk.reduce((curr, item) => curr += '__label__' + item.class + ' ' + item.text + '\n', ''));
                },
                (cb) => cb(null, '')
            ),
            write = fs.createWriteStream(paths.pretrainedData);

        miss.pipe(readDb, transform, write, (err) => {
            if (err) reject(err);
            else resolve(entries);
        });
    }),

    train: async function() {
        knownTexts = [];

        try {
            let entries = await functions.prepareTrainingData();

            if (entries > 0) {
                await fastText.train();
                console.log("Successfully trained");
                await fastText.unload();
                await fastText.load();
            }
            await unlinkAsync(paths.pretrainedData);
        }
        catch (err) {
            console.error('An error occured during classifier training: ', err);
        }
    },

    predict: async function(text) {
        let className;
        try {
			className = (await fastText.predict(text))[0].label;
        }
        catch (err) {
            console.error('An error occured during classifier prediction: ', err);
            throw Error(err);
        }
        finally {
            if (!className) className = 'unknown';
            await functions.saveTrainingText(className, text);
            return className;
        }
    },

    saveTrainingText: async (className, text) => {
		if (knownTexts.includes(text)) return;
        try {
            await db.create({ class: className, text: text, checked: false })
            knownTexts.push(text);
        }
        catch (err) { }
    }

};

module.exports.initialize = async () => {
    //Check FastText library existence
    if (!process.env.FASTTEXT_PATH || fs.existsSync(process.env.FASTTEXT_PATH) === false) throw 'FastText library not found';

    //Create missing directories and files
    if (!await existsAsync('./training_data')) await mkdirAsync('./training_data');
	if (!await existsAsync(paths.db)) fs.closeSync(fs.openSync(paths.db, 'w'));

    //Train and set training interval
    let trainFunction = async () => {
        let mtime = (await statAsync(paths.db)).mtime.toString();
        if (mtime === modifiedStamp) return;
        modifiedStamp = mtime;
        await functions.train();
    };
    await trainFunction();
    setInterval(trainFunction, trainingInterval * 1000);

    return functions;
}