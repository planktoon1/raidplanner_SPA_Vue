const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

// Get raids
router.get('/', async (req,res) => {
    const raids = await loadRaidsCollection();
    res.send(await raids.find({}).toArray());
});

// Add raid
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

// Hatch a raid - pokemon still unknown, time and tier gets updated
router.post('/hatch', async (req, res) => {
    const raids = await loadRaidsCollection();
    const raid = await raids.findOne({_id: new mongodb.ObjectID(req.body.id)});
    await raids.updateOne({_id: new mongodb.ObjectID(req.body.id)}, { 
        $set: { 
            tier:`Hatched: ${raid.tier}`,
            time: new Date(raid.hatchTime.getTime() + 45*60000) //Add 45 minutes to the time
        }});
    res.status(200).send();
});

// Delete raid
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