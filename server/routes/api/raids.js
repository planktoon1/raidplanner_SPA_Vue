const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

// Get raids
router.get('/', async (req,res) => {
    const raids = await loadRaidsCollection();
    res.send(await raids.find({}).toArray());
});

// Add raids
router.post('/',async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.insertOne({
        navn: req.body.navn,
        tier: req.body.tier,
        pokemon: req.body.pokemon,
        hatchTime: req.body.hatchTime,
        finishTime: req.body.finishTime
    });
    
    res.status(201).send();
})

// Delete raids
router.delete('/:id', async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.deleteOne({_id: new mongodb.ObjectID(req.params.id)});
    res.status(200).send();
});

async function loadRaidsCollection(){
    const client = await mongodb.MongoClient.connect(
        'mongodb://abc123:abc123@ds239873.mlab.com:39873/vue_express',
        {useNewUrlParser: true
    });

    return client.db('vue_express').collection('viby_raids');
}

module.exports = router;