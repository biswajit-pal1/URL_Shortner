import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userUrlsSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    urls: [{
        type: Schema.Types.ObjectId,
        ref: 'Url'
    }]
});

const UserUrls = mongoose.model('UserUrls', userUrlsSchema);
export default UserUrls;
