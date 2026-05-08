
const mongoose=require('mongoose')

const mongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('mongoDB connected.');
    } catch (error) {
        console.log(error);
    }
}
module.exports=mongoDB;