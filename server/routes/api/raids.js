const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

// Get active raids
router.get('/', async (req,res) => {
    const raids = await loadRaidsCollection();
    res.send(await raids.find({state: {$in: ["hatched","nothatched"]}}).toArray());
});

// Active a raid - not hatched. params => POST body: { id: "", hatchTime: "", tier: ""}
router.post('/activate/nothatched',async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id: new mongodb.ObjectID(req.body.id)}, { 
        $set: { 
            state: 'nothatched',
            hatchTime: req.body.hatchTime,
            tier: req.body.tier
        }});
    res.status(200).send();
})

// Active a raid - already hatched. params => POST body: { id: "", finishTime: "", pokemon: ""}
router.post('/activate/hatched',async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id: new mongodb.ObjectID(req.body.id)}, { 
        $set: { 
            state: 'hatched',
            finishTime: req.body.finishTime,
            pokemon: req.body.pokemon
        }});
    res.status(200).send();
})

// Hatch a raid - pokemon still unknown, finishtime is set to hatchtime plus 45 minutes
//params => POST body: { id: ""}
router.post('/hatch', async (req, res) => {
    const raids = await loadRaidsCollection();
    const raid = await raids.findOne({_id: new mongodb.ObjectID(req.body.id)});
    await raids.updateOne({_id: new mongodb.ObjectID(req.body.id)}, { 
        $set: { 
            state: 'hatched',
            pokemon: `Hatched: ${raid.tier}`,
            finishTime: new Date(raid.hatchTime.getTime() + 45*60000) //Add 45 minutes to the time
        }});
    res.status(200).send();
});

// Deactivate a raid - set all the fields back to default and the state to inactive
//params => POST body: { id: ""}
router.post('/deactivate', async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id: new mongodb.ObjectID(req.body.id)}, { 
        $set: { 
            state: 'inactive',
            hatchTime: null,
            finishTime: null,
            tier: null,
            pokemon: null
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