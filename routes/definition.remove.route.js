const url = require('url');  

const db = require('../db');

module.exports = async (req, res, next) => {
    //Db request
    let msg;
    try {
        await db.remove(req.body.id);
        msg = 'Entry was successfully removed';
    }
    catch (err) {
        console.error("Error during removing definition: " + err);
        msg = 'Entry removing error: ' + err.message;
    }

    if (req.body.page) req.query.page = req.body.page;
    if (req.body.perPage) req.query.perPage = req.body.perPage;
    if (req.body.sort) req.query.sort = req.body.sort;
    if (req.body.asc) req.query.asc = req.body.asc;
    if (req.body.search) req.query.search = req.body.search;
    if (msg) req.query.message = msg;

    res.redirect(url.format({ pathname:"/list", query: req.query }));
}