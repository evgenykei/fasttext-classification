const fs          = require('fs'),
      {promisify} = require('util'),
      config      = require('config'),
      FastText    = require('fasttext.js');

const readFileAsync  = promisify(fs.readFile),
      writeFileAsync = promisify(fs.writeFile),
      unlinkAsync    = promisify(fs.unlink),
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

    train: async function() {
        knownTexts = [];

        try {
            let training = JSON.parse(await readFileAsync(paths.trainingData, 'utf8'));
            if (training.length === 0) return;
            training.map((item) => knownTexts.push(item.text.toLowerCase()));

            let parsed = '';
            training.forEach((item) => parsed += '__label__' + item.class + ' ' + item.text + '\n');
            await writeFileAsync(paths.pretrainedData, parsed, 'utf8');

            await fastText.train();
            console.log("Successfully trained");
            await fastText.unload();
            await fastText.load();
            await unlinkAsync(paths.pretrainedData);
        }
        catch (err) {
            console.error('An error occured during classifier training: ', err);
            throw Error(err);
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
            let training = JSON.parse(await readFileAsync(paths.trainingData, 'utf8'));

            training.push({ class: className, text: text, checked: false })
            await writeFileAsync(paths.trainingData, JSON.stringify(training, null, 2));
            knownTexts.push(text);
        }
        catch (err) {
            console.error('An error occured during classification save: ', err);
        }
    },

    getTrainingData: async () => {
        try {
            return JSON.parse(await readFileAsync(paths.trainingData, 'utf8'))
        }
        catch (err) {
            console.error('An error occured during reading training data: ', err);
        }
    },

    setTrainingData: async (training) =>  {
        try {
            await writeFileAsync(paths.trainingData, JSON.stringify(training, null, 2));
        }
        catch (err) {
            console.error('An error occured during writing training data: ', err);
        }
    }

};

module.exports.initialize = async () => {
    //Check FastText library existence
    if (!process.env.FASTTEXT_PATH || fs.existsSync(process.env.FASTTEXT_PATH) === false) throw 'FastText library not found';

    //Create missing directories
    if (!await existsAsync('./training_data')) await mkdirAsync('./training_data');

    //Create training data if not exists
    if (!await existsAsync(paths.trainingData)) 
        await writeFileAsync(paths.trainingData, JSON.stringify([], null, 2));

    //Train and set training interval
    let trainFunction = async () => {
        let mtime = (await statAsync(paths.trainingData)).mtime.toString();
        if (mtime === modifiedStamp) return;
        modifiedStamp = mtime;
        await functions.train();
    };
    await trainFunction();
    setInterval(trainFunction, trainingInterval * 1000);

    return functions;
}