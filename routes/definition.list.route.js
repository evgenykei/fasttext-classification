const Joi = require('joi');

const db = require('../db');

module.exports = async (req, res, next) => {
    let page    = req.query.page,
        perPage = req.query.perPage,
        sort    = req.query.sort,
        asc     = req.query.asc,
        search  = req.query.search,
        message = req.query.message

    //Validation
    page = Joi.validate(page, Joi.number().required().min(1)).error === null ? parseInt(page) : 1;
    perPage = Joi.validate(perPage, Joi.number().required().min(10).max(100)).error === null ? parseInt(perPage) : 10;
    asc = Joi.validate(asc, Joi.number().required().valid(-1, 1)).error === null ? parseInt(asc) : null;
    search = Joi.validate(search, Joi.string().required().min(1).max(100)).error === null ? search : null;

    //Db request
    try {
        let dbResponse = await db.getMany(page, perPage, sort, asc, search);

        if (dbResponse.pages === 0) page = 1
        if (page > dbResponse.pages) page = dbResponse.pages

        res.render('definitions', { 
            definitions: dbResponse.data,
            message: message,
            query: {
                page: page,
                perPage: perPage,
                sort: sort,
                asc: asc,
                search: search
            },
            querystring: require('querystring'),
            pagination: {
                first: page > 1 ? 1 : null,
                previous: page > 1 ? page - 1 : null,
                current: page,
                next: page < dbResponse.pages ? page + 1 : null,
                last: page < dbResponse.pages ? dbResponse.pages : null
            }
        })
    }
    catch (err) {
        console.error("Error during requesting definition list: " + err);
        res.sendStatus(500);
    }
}