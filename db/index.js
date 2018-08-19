const Datastore  = require('nedb'),
      Joi        = require('joi');

const db         = new Datastore({ filename: __dirname + '/db', autoload: true }),
      NedbReader = require('./nedbReader');

const defSchema = Joi.object().keys({
    class: Joi.string().uppercase().required(),
    text: Joi.string().lowercase().required(),
    checked: Joi.boolean().required()
});

const getAutoIncrement = (type) => new Promise((resolve, reject) => {
    type = 'ai_' + type;

    db.update({ type: type }, { $inc: { value: 1 }}, { upsert: true, returnUpdatedDocs: true }, function(err, num, doc) {
        if (err) return reject(err);
        else resolve(doc.value);
    })
});

const count = (query) => new Promise((resolve, reject) => {
    db.find(query, function(err, docs) {
        if (err) return reject(err);
        else resolve(docs.length);
    })
});

module.exports = functions = {

    read: () => new NedbReader(db, { type: 'def' }),

    get: (id) => new Promise((resolve, reject) => {
        db.findOne({ _id: id, type: 'def' }, function (err, doc) {
            if (err) return reject(err);
            else resolve(doc);
        });
    }),    
    
    find: (text) => new Promise((resolve, reject) => {
        db.findOne({ type: 'def', text: text }, function(err, doc) {
            if (err) return reject(err);
            else resolve(doc);
        });
    }),

    getMany: (page, perPage, sort, asc, search) => new Promise(async (resolve, reject) => {
        //Validate
        if (!page) page = 1;
        if (!perPage) perPage = 10;
        if (!asc) asc = 1;
        
        let regexp;
        if (search) {
            try { regexp = new RegExp(search); }
            catch (err) { }
        }

        //Querying
        let queryObj = { type: 'def' }; 
        if (regexp) queryObj['$or'] = [{ class: regexp }, { text: regexp }, { checked: regexp }];

        let pages; 
        try { pages = Math.ceil(await count(queryObj) / perPage); }
        catch (err) { return reject(err) };
        if (page > pages) page = pages
        
        let query = db.find(queryObj);
        if (sort === 'class') query = query.sort({ class: asc });
        else if (sort === 'text') query = query.sort({ text: asc });
        else if (sort === 'checked') query = query.sort({ checked: asc });
        else query = query.sort({ _id: asc });

        query.skip((page - 1) * perPage).limit(perPage).exec(function(err, docs) {
            if (err) return reject(err);
            else resolve({ data: docs, pages: pages });
        })
    }),

    create: (obj) => new Promise(async (resolve, reject) => {
        validation = defSchema.validate(obj);
        if (validation.error) return reject(validation.error);
        obj = await validation.then();

        try { if (await functions.find(obj.text)) return reject(new Error('definition already exists')); }
        catch (err) { return reject(err); }

        try { 
            obj._id = await getAutoIncrement('def');
            obj.type = 'def';
        }
        catch (err) { return reject(err); }

        db.insert(obj, function(err, newDocs) {
            if (err) return reject(err);
            else resolve(newDocs);
        })
    }),

    update: (id, obj) => new Promise(async (resolve, reject) => {
        let validation = Joi.validate(id, Joi.number().required().min(1));
        if (validation.error) return reject(validation.error);
        id = await validation.then();

        validation = defSchema.validate(obj);
        if (validation.error) return reject(validation.error);
        obj = await validation.then();

        let exists = await functions.find(obj.text);
        try { if (exists && exists._id !== id) return reject(new Error('definition already exists')); }
        catch (err) { return reject(err); }

        db.update({ _id: id, type: 'def' }, { $set: { class: obj.class, text: obj.text, checked: obj.checked }}, function(err, numReplaced) {
            if (err || numReplaced === 0) return reject(err || new Error('not found'));
            else resolve(numReplaced);
        })
    }),

    remove: (id) => new Promise(async (resolve, reject) => {
        let validation = Joi.validate(id, Joi.number().required().min(1));
        if (validation.error) return reject(validation.error);
        id = await validation.then();

        db.remove({ _id: id, type: 'def' }, {}, function (err, numRemoved) {
            if (err || numRemoved === 0) return reject(err || 'not found');
            else resolve(numRemoved);
        });
    })
}