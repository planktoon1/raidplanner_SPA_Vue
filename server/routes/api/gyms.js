const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

// Get gyms
router.get('/', async (req,res) => {
    const gyms = await loadGymsCollection();
    res.send(await gyms.find({}).toArray());
});

// Add gyms
router.post('/',async (req, res) => {
    const gyms = await loadGymsCollection();
    await gyms.insertOne({
        navn: req.body.navn,
        tier: req.body.tier,
        pokemon: req.body.pokemon,
        hatchTime: req.body.hatchTime,
        finishTime: req.body.finishTime
    });
    
    res.status(201).send();
})

// Delete gym
router.delete('/:id', async (req, res) => {
    const gyms = await loadGymsCollection();
    await gyms.deleteOne({_id: new mongodb.ObjectID(req.params.id)});
    res.status(200).send();
});

async function loadGymsCollection(){
    const client = await mongodb.MongoClient.connect(
        'mongodb://abc123:abc123@ds239873.mlab.com:39873/vue_express',
        {useNewUrlParser: true
    });

    return client.db('vue_express').collection('viby_gyms');
}

module.exports = router;