const stream = require('stream'),
      util   = require('util');

function NedbReader(db, query, options) { 
    if (!options) options = { objectMode: true };
    else options.objectMode = true;

    stream.Readable.call(this, options);

    this._cursor = db.find(query);
    this._curr = 0;
}

util.inherits(NedbReader, stream.Readable);

NedbReader.prototype._read = function() {
	const bufferSize = 50, context = this;
	
    this._cursor.skip(this._curr).limit(bufferSize).exec(function(err, docs) {
		if (err) throw (err);
		else if (docs.length === 0) context.push(null);
		else context.push(docs);
	});
	
	this._curr += bufferSize;
};

module.exports = NedbReader;