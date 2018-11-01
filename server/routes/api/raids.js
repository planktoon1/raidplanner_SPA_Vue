const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

// Get active raids
router.get('/', async (req,res) => {
    const raidsCol = await loadRaidsCollection();
    const raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray()

    for (raid of raids) {
        if (raid.state == "hatched" && overDue(raid.finishTime)) {
            deactivateRaid(raid._id);
            raid.state = "inactive";
            raid.hatchTime = null;
            raid.finishTime = null;
            raid.tier = null;
            raid.pokemon = null;
            console.log(`Deactivated ${raid._id}`);

        } else if(raid.state == "nothatched" && overDue(raid.hatchTime)) {
            hatchRaid(raid._id);
            raid.state = "hatched";
            raid.pokemon = `Hatched: ${raid.tier}`;
            raid.finishTime = (new Date(raid.hatchTime).getTime() + 45*60000);
            console.log(`Hatched ${raid._id}`);

        }
    }

    function overDue(date){
        const dateMs = new Date(date).getTime();
        const nowMs = new Date();
        const deltaMs = dateMs - nowMs;

        if (deltaMs <= 0) {
            return true;
        } else
            return false;
    }

    res.send(raids);
});

// Active a raid - not hatched. params => POST body: { id: "", hatchTime: "", tier: ""}
router.post('/activate/nothatched',async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'nothatched',
            hatchTime: req.body.hatchTime,
            tier: req.body.tier
        }});
    
    res.status(200).send();
    console.log(`${req.body.id} activated. Hatching at: ${req.body.hatchTime} as ${req.body.tier}`);
})

// Active a raid - already hatched. params => POST body: { id: "", finishTime: "", pokemon: ""}
router.post('/activate/hatched',async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'hatched',
            finishTime: req.body.finishTime,
            pokemon: req.body.pokemon
        }});
    res.status(200).send();
    console.log(`${req.body.id} activated. Finishing at: ${req.body.finishTime} as ${req.body.pokemon}`);
})

// Hatch a raid - pokemon still unknown, finishtime is set to hatchtime plus 45 minutes
//params => POST body: { id: ""}
router.post('/hatch', async (req, res) => { //Through API request
    const raids = await loadRaidsCollection();
    const raid = await raids.findOne({_id: req.body.id});
    await raids.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'hatched',
            pokemon: `Hatched: ${raid.tier}`,
            finishTime: new Date(raid.hatchTime).getTime() + 45*60000 //Add 45 minutes to the time
        }});
    res.status(200).send();
});

async function hatchRaid(id)  { //For use internally in the server application
    const raids = await loadRaidsCollection();
    const raid = await raids.findOne({_id: id});
    await raids.updateOne({_id: id}, { 
        $set: { 
            state: 'hatched',
            pokemon: `Hatched: ${raid.tier}`,
            finishTime: new Date(raid.hatchTime).getTime() + 45*60000 //Add 45 minutes to the time
        }});
}

// Deactivate a raid - set all the fields back to default and the state to inactive
//params => POST body: { id: ""}
router.post('/deactivate', async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'inactive',
            hatchTime: null,
            finishTime: null,
            tier: null,
            pokemon: null
        }});
    res.status(200).send();
});

async function deactivateRaid(id) {
    const raids = await loadRaidsCollection();
    await raids.updateOne({_id:id}, { 
        $set: { 
            state: 'inactive',
            hatchTime: null,
            finishTime: null,
            tier: null,
            pokemon: null
        }});
};

// Delete raid - not used anywhere
router.delete('/:id', async (req, res) => {
    const raids = await loadRaidsCollection();
    await raids.deleteOne({_id: req.params.id});
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