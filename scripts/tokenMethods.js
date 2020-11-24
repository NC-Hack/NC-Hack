const crypto = require("crypto");
const User = require("../models/user.model");
module.exports = {
issueToken: function (user, done) {
    const token = crypto.randomBytes(64).toString('hex');
    module.exports.saveRememberMeToken(token, user.id, function(err) {
        if (err) { return done(err); }
        return done(null, token);
    });
},

saveRememberMeToken: function(token, uid, fn) {
    User.findOne({ _id: uid }, (err, user) => {
        if (err) throw err;
        user.token = token;
        user.save();
        return fn();
    });
}
};
