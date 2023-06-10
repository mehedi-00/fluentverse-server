const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;


//  middleware 

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.SESCRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k8bloyi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("flauentDb").collection('users');
        const classColection = client.db("flauentDb").collection('classes');
        const selectClassCollection = client.db("flauentDb").collection('selectClasses');


        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SESCRET_TOKEN, { expiresIn: '2h' });

            res.send({ token });
        });

        // admin verify
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        };
        //   verify instructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        };

        // user Api here
        app.get('/users', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' });
            }
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/user/role/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query, { projection: { _id: 0, role: 1 } });
            res.send(result);
        });

        // make admin and  instructor
        app.patch('/user/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const role = req.query.role;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: role,
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists' });
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // class route

        app.get('/allclasses', async (req, res) => {
            const result = await classColection.find().toArray();
            res.send(result);
        });
        app.get('/classes', verifyJWT, verifyInstructor, async (req, res) => {
            const userEmail = req.query.email;
            const query = { instructor_email: userEmail };
            const result = await classColection.find(query).toArray();
            res.send(result);
        });
        // all approved users
        app.get('/approved-classes', async (req, res) => {

            const query = {
                status: 'approve',
            };
            const result = await classColection.find(query).toArray();
            res.send(result);

        });

        app.post('/classes', verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await classColection.insertOne(data);
            res.send(result);
        });

        app.patch('/class-status/deny/:classId', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.classId;
            const body = req.body;
            console.log(body);
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'deny',
                    feedback: body.feedback
                }
            };
            const result = await classColection.updateOne(query, updateDoc);
            res.send(result);

        });
        app.patch('/class-status/approve/:classId', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.classId;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approve',
                }
            };
            const result = await classColection.updateOne(query, updateDoc);
            res.send(result);

        });
        // student api here
        app.post('/select-class', verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await selectClassCollection.insertOne(data);
            res.send(result);
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', async (req, res) => {
    res.send('server is Running');
});
app.listen(port, () => {
    console.log(`Server listening on ${port}`);
});