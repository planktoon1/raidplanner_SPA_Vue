const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

router.raids = [];
router.raidGroups = [];

// Initialize 
initialize();
async function initialize(){
    const raidsCol = await loadRaidsCollection();
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
    const raidGroupsCol = await loadRaidGroupCollection();
    router.raidGroups = await raidGroupsCol.find({}).toArray();
}

// Get active raids
router.get('/', async (req,res) => {
    for (raid of router.raids) {
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

    res.send(router.raids);
});

// Active a raid - not hatched. params => POST body: { id: "", hatchTime: "", tier: ""}
router.post('/activate/nothatched',async (req, res) => {
    const raidsCol = await loadRaidsCollection();
    await raidsCol.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'nothatched',
            hatchTime: req.body.hatchTime,
            tier: req.body.tier
        }});
    
    res.status(200).send();

    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
    console.log(`${req.body.id} activated. Hatching at: ${req.body.hatchTime} as ${req.body.tier}`);
})

// Active a raid - already hatched. params => POST body: { id: "", finishTime: "", pokemon: ""}
router.post('/activate/hatched',async (req, res) => {
    const raidsCol = await loadRaidsCollection();
    await raidsCol.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'hatched',
            finishTime: req.body.finishTime,
            pokemon: req.body.pokemon
        }});
    res.status(200).send();
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
    console.log(`${req.body.id} activated. Finishing at: ${req.body.finishTime} as ${req.body.pokemon}`);
})

// Hatch a raid - pokemon still unknown, finishtime is set to hatchtime plus 45 minutes
//params => POST body: { id: ""}
router.post('/hatch', async (req, res) => { //Through API request
    const raidsCol = await loadRaidsCollection();
    const raid = await raidsCol.findOne({_id: req.body.id});
    await raidsCol.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'hatched',
            pokemon: `Hatched: ${raid.tier}`,
            finishTime: new Date(raid.hatchTime).getTime() + 45*60000 //Add 45 minutes to the time
        }});
    res.status(200).send();
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
});

async function hatchRaid(id)  { //For use internally in the server application
    const raidsCol = await loadRaidsCollection();
    const raid = await raidsCol.findOne({_id: id});
    await raidsCol.updateOne({_id: id}, { 
        $set: { 
            state: 'hatched',
            pokemon: `Hatched: ${raid.tier}`,
            finishTime: new Date(raid.hatchTime).getTime() + 45*60000 //Add 45 minutes to the time
        }});
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
}

// Get raidgroups on a specific raid
// params => POST body: {raidId: ""}
router.post('/raidgroups', async (req, res) => {
    let raidGroupsWithId = [];
    raidGroupsWithId = router.raidGroups.filter((raid) => {return raid.raidId == req.body.raidId});
    if (raidGroupsWithId.length > 0) {
        res.send(raidGroupsWithId);
    } else res.status(404).send();
    
});

// Create raid group
// params => POST body: {raidId: "", name: "", startTime: ""}
router.post('/raidgroups/create', async (req, res) => {
    //TODO if (raid exists){do things} else send 404 response
    const new_id = new mongodb.ObjectID();
    router.raidGroups.push({
        _id:            new_id,
        raidId:         req.body.raidId,
        name:           req.body.name,
        startTime:      new Date(req.body.startTime),
        participants:   []
    });
    res.status(200).send(new_id);
});

// Add participant to raid group
//params => POST body: {id: "", name: ""}
router.post('/raidgroups/participate', async (req, res) => {
    const raidgroup = router.raidGroups.find((raid) => {return raid._id == req.body.id});
    if (raidgroup) {
        raidgroup.participants.push(req.body.name);
        res.status(200).send();
    } else res.status(404).send();
});

// Delete all raidgroups with a specific raidId
// params => DELETE params: '../:raidId'
router.delete('/raidgroups/:raidId', async (req, res) => {
    router.raidGroups = router.raidGroups.filter((raid) => {return raid.raidId != req.params.raidId});

    //integrate db //TODO
    /*await router.raidGroupsCol.deleteMany({"raidId": req.params.raidId});
    res.status(200).send();
    router.raidGroups = await raidGroupsCol.find({}).toArray();*/
});

async function deleteRaidGroups(raidId) {
    router.raidGroups = router.raidGroups.filter((raid) => {return raid.raidId != raidId});

    //integrate db //TODO
    /*await router.raidGroupsCol.deleteMany({"raidId": req.params.raidId});
    res.status(200).send();
    router.raidGroups = await raidGroupsCol.find({}).toArray();*/
}

// Deactivate a raid - set all the fields back to default and the state to inactive
//params => POST body: { id: ""}
router.post('/deactivate', async (req, res) => {
    const raidsCol = await loadRaidsCollection();
    await raidsCol.updateOne({_id: req.body.id}, { 
        $set: { 
            state: 'inactive',
            hatchTime: null,
            finishTime: null,
            tier: null,
            pokemon: null
        }});
    deleteRaidGroups(req.body.id)
    res.status(200).send();
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
});

async function deactivateRaid(id) {
    const raidsCol = await loadRaidsCollection();
    await raidsCol.updateOne({_id:id}, { 
        $set: { 
            state: 'inactive',
            hatchTime: null,
            finishTime: null,
            tier: null,
            pokemon: null
        }});
    deleteRaidGroups(id);
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
};

// Delete raid - not used anywhere
router.delete('/:id', async (req, res) => {
    const raidsCol = await loadRaidsCollection();
    await raidsCol.deleteOne({_id: req.params.id});
    res.status(200).send();
    router.raids = await raidsCol.find({state: {$in: ["hatched","nothatched"]}}).toArray();
});

// Make connection to the raids collection
async function loadRaidsCollection(){
    const client = await mongodb.MongoClient.connect(
        'mongodb://abc123:abc123@ds239873.mlab.com:39873/vue_express',
        {useNewUrlParser: true
    });

    return client.db('vue_express').collection('viby_raids');
}

// Make connection to the raidgroup collection
async function loadRaidGroupCollection(){
    const client = await mongodb.MongoClient.connect(
        'mongodb://abc123:abc123@ds239873.mlab.com:39873/vue_express',
        {useNewUrlParser: true
    });

    return client.db('vue_express').collection('viby_raidGroups');
}

module.exports = router;