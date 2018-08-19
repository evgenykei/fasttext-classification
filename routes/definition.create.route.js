const url = require('url');  

const db = require('../db');

module.exports = async (req, res, next) => {
    //Db request
    let msg;
    try {
        await db.create({ class: req.body.class, text: req.body.text, checked: req.body.checked });
        msg = 'Entry was successfully created';
    }
    catch (err) {
        console.error("Error during creating new definition: " + err);
        msg = 'Entry creation error: ' + err.message;
    }

    if (req.body.page) req.query.page = req.body.page;
    if (req.body.perPage) req.query.perPage = req.body.perPage;
    if (req.body.sort) req.query.sort = req.body.sort;
    if (req.body.asc) req.query.asc = req.body.asc;
    if (req.body.search) req.query.search = req.body.search;
    if (msg) req.query.message = msg;

    res.redirect(url.format({ pathname:"/list", query: req.query }));
}