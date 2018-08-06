const fs          = require('fs'),
      path        = require('path'),
      {promisify} = require('util'),
      shell       = require('shelljs');

const readFileAsync = promisify(fs.readFile),
      unlinkAsync   = promisify(fs.unlink);

const executeCommand = (command) => new Promise((resolve, reject) => {
    shell.exec(command, function(code, stdout, stderr) {
        if (code === 0) resolve(stdout);
        else reject('command execute error');
    });
});

const functions = (ftPath) => ({

    train: (pretrainedPath, trainedPath, trainingOptions) => {
        if (trainingOptions && trainingOptions.length !== 0) trainingOptions = '-' + trainingOptions.join(' -');
        let command = `${ftPath} supervised -input ${pretrainedPath} -output ${trainedPath} ${trainingOptions}`;
 
        return executeCommand(command);
    },

    predict: (trainedPath, predictPath, predictNum) => {
        let command = `${ftPath} predict ${trainedPath}.bin ${predictPath} ${predictNum || 1}`;

        return executeCommand(command);
    }

})

//Initializer
module.exports.initialize = (path) => {
    try {
        if (!path || fs.existsSync(path) === false) throw 'FastText library not found';
        else return functions(path);
    }
    catch (err) {
        console.error('An error occured while FastText wrapper initialization: ', err);
        throw Error(err);
    }
}