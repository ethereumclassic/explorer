var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var DAOCreatedToken = new Schema(
{
    "transactionHash": {type: String, index: {unique: true}},
    "blockNumber": {type: Number, index: {unique: false}},
    "amount": String,
    "to": String,
    "timestamp": Number
});

var DAOTransferToken = new Schema(
{
    "transactionHash": {type: String, index: {unique: true}},
    "blockNumber": {type: Number, index: {unique: false}},
    "amount": String,
    "to": String,
    "from": String,
    "timestamp": Number
});

mongoose.model('DAOCreatedToken', DAOCreatedToken);
mongoose.model('DAOTransferToken', DAOTransferToken);
module.exports.DAOCreatedToken = mongoose.model('DAOCreatedToken');
module.exports.DAOTransferToken = mongoose.model('DAOTransferToken');