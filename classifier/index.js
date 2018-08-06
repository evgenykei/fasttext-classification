const fs          = require('fs'),
      path        = require('path'),
      {promisify} = require('util'),
      config      = require('config');

const ftWrapper = require('./ftWrapper').initialize(process.env.FASTTEXT_PATH);

const readFileAsync  = promisify(fs.readFile),
      writeFileAsync = promisify(fs.writeFile),
      unlinkAsync    = promisify(fs.unlink),
      existsAsync    = promisify(fs.exists),
      statAsync      = promisify(fs.stat),
      mkdirAsync     = promisify(fs.mkdir);

const paths    = config.get('Path')
      training = config.get('Training');

const trainingInterval = config.get('Timers.trainingInterval');

const trainingOptions = (() => {
    if (!training) return;
    
    let params = [];
    for (let par in training){
        if (par.startsWith('_') === true) continue;
        let val = training[par];
        if (val) params.push(par + ' ' + val);
    }

    return params;
})();

var knownTexts = [], modifiedStamp;

const functions = {

    train: async function() {
        knownTexts = [];

        try {
            let training = JSON.parse(await readFileAsync(paths.trainingData, 'utf8'));
            if (training.length === 0) return;
            training.map((item) => knownTexts.push(item.text.toLowerCase()));

            let writeStream = fs.createWriteStream(paths.pretrainedData);
            training.forEach((item) => writeStream.write('__label__' + item.class + ' ' + item.text + '\n'));
            writeStream.end();

            await ftWrapper.train(paths.pretrainedData, paths.trainedData, trainingOptions);
            await unlinkAsync(paths.pretrainedData);
        }
        catch (err) {
            console.error('An error occured during classifier training: ', err);
            throw Error(err);
        }
    },

    predict: async function(texts) {
        let className;
        try {
            let writeStream = fs.createWriteStream(paths.predictData);
            texts.forEach((item) => writeStream.write(item + '\n'));
            writeStream.end();

            className = (await ftWrapper.predict(paths.trainedData, paths.predictData)).replace(/(__label__|\n)/g, '');
            await unlinkAsync(paths.predictData);
        }
        catch (err) {
            console.error('An error occured during classifier prediction: ', err);
            throw Error(err);
        }
        finally {
            if (!className) className = 'unknown';
            await functions.saveTrainingText(className, texts.filter(x => !knownTexts.includes(x)));
            return className;
        }
    },

    saveTrainingText: async (className, texts) => {
        if (texts.length === 0) return;
        try {
            let training = JSON.parse(await readFileAsync(paths.trainingData, 'utf8'));

            texts.forEach((text) => training.push({ class: className, text: text, checked: false }));;
            await writeFileAsync(paths.trainingData, JSON.stringify(training, null, 2));
            texts.forEach((text) => knownTexts.push(text));
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