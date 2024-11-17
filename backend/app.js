import express from "express"
import { config } from "dotenv";
import cors from "cors";
import {sendEmail} from "./utils/sendEmail.js"
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb"

const app = express();
const router = express.Router();
const port = process.env.PORT || 5000

config({path: "./config.env"});
console.log(process.env.PORT)


app.use(cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["POST"],
    credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({extended: true}));


// mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@gym-app-cluster.p8muk.mongodb.net/?retryWrites=true&w=majority&appName=Gym-App-Cluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// MongoDb collections
let classesCollection;
let usersCollection;
let cartCollection;
let paymentCollection;
let enrolledCollection;
let appliedCollection;




async function initializeDB() {
    try {
      await client.connect();
      console.log("Connected to MongoDB!");
  
      const database = client.db("gym-app-db");
      classesCollection = database.collection("classes");
      usersCollection = database.collection("users")
      cartCollection = database.collection("cart")
      paymentCollection = database.collection("payments")
      enrolledCollection = database.collection("enrolled")
      appliedCollection = database.collection("applied")
  
      // Send a ping to confirm successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. MongoDB is ready!");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      process.exit(1); // Exit the process if the database connection fails
    }
  }
  
  initializeDB();

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

//     // create database and collections

//     const database = client.db("gym-app-db")
//     const usersCollection = database.collection("users")
//     const classesCollection = database.collection("classes")
//     const cartCollection = database.collection("cart")
//     const paymentCollection = database.collection("payments")
//     const enrolledCollection = database.collection("enrolled")
//     const appliedCollection = database.collection("applied")

//     // classes routes here
//     app.post('/new-class', async(req, res) => {
//         const newClass = req.body;
//         const result = await classesCollection.insertOne(newClass);
//         res.send(result);


//     })
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Welcome to the Gym App Backend!");
});

// add new classes
app.post("/new-class", async (req, res) => {
try {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.status(201).json({
        success: true,
        message: "Class created successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create class.",
      });
    }
  });

// get all approved classes
app.get('/classes', async(req, res) => {
      const query = {status: 'approved'};
      const result  = await classesCollection.find().toArray();
      res.send(result);
})

// get classes by instructor email address
app.get('/classes/:email', async(req, res) => {
    const email = req.params.email;
    const query = {instructorEmail: email};
    const result = await classesCollection.find(query).toArray();
    res.send(result);
})

// manage classes
app.get('/classes-manage', async(req,res) => {
    const result = await classesCollection.find().toArray();
    res.send(result);
})

// update classes status and reason
app.patch('/change-status/:id', async(req, res) => {
    const id = req.params.id;
    const status = req.body.status;
    const reason = req.body.reason;
    const filter = {_id: new ObjectId(id)};
    const options = { upsert: true}
    const updateDoc = {
        $set: {
            status: status,
            reason: reason,
        },
    };
    const result = await  classesCollection.updateOne(filter, updateDoc, options);
    res.send(result);
})

// get approved classes
app.get('/approved-classes', async(req,res) => {
    const query = {status: "approved"};
    const result = await classesCollection.find(query).toArray();
    res.send(result);
});

// get single class details
app.get('/class/:id', async (req, res) => {
    const id = req.params.id;
    const  query = {_id: new Object(id)};
    const result = await classesCollection.findOne(query);
    res.send(result);
})

// update class details (all data)
app.put('/update-class/:id', async(req, res)=> {
    const id = req.params.id;
    const updateClass = req.body;
    const filter = {_id: new ObjectId(id)};
    const options = {upsert: true};
    const updateDoc = {
        $set: {
            name: updateClass.name,
            description: updateClass.description,
            price: updateClass.price,
            availableSeats: parseInt(updateClass.availableSeats),
            videoLink: updateClass.videoLink,
            status: "pending",
        }
    }

    const result = await classesCollection.updateOne(filter, updateDoc, options);
    res.send(result);

})

router.post("/send/mail", async(req,res,next)=>{
    const {name,email,message} = req.body;
    if (!name||!email||!message) {
        return next(
            res.status(400).json({
                success: false,
                message: "Please provide all details",
            })
        )
    }

    try{
        await sendEmail({
            email:"shritichanda5@gmail.com",
            subject: "GYM WEBSITE CONTACT",
            message,
            userEmail: email,

        })
        res.status(200).json({
            success: true,
            message: "Message Sent Successfully.",
        })
    }catch(error){
        res.status(500).json({
            success: false,
            message: "Internal Server Error.",
        })

    }
})

app.use(router)

app.listen(process.env.PORT, ()=>{
    console.log(`Server listening at port ${process.env.PORT}`);
});


