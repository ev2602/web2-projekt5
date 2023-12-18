const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const fse = require('fs-extra');
const webpush = require('web-push');

const app = express();
app.use(express.json());
const port = 3000;

app.use((req, res, next) => {
    console.log(new Date().toLocaleString() + " " + req.url);
    next();
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(__dirname + 'index.html');
});

const UPLOAD_PATH = path.join(__dirname, "uploads");
var uploadSnaps = multer({
    storage:  multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, UPLOAD_PATH);
        },
        filename: function (req, file, cb) {
            let fn = file.originalname.replaceAll(":", "-");
            cb(null, fn);
        },
    })
})


app.post("/saveSnaps", uploadSnaps.single('workoutPhoto'), function (req, res) {
    const title = req.body.title;
    const workout_title = req.body.workout_title;
    const duration = req.body.duration;
    const workoutPhotoPath = req.file.filename;

    const workoutData = {
        title,
        workout_title,
        duration,
        photoPath: workoutPhotoPath,
    };

    const timestamp = Date.now();
    const fileName = `workouts/${timestamp}.json`;

    fs.writeFile(fileName, JSON.stringify(workoutData), (err) => {
        if (err) throw err;
        console.log('Workout data saved to file:', fileName);
    });

    //await sendPushNotifications(req.body.title);

    res.sendStatus(200);
});

app.post("/testPushNotification", function (req, res) {
    const snapTitle = "Test Push"; 

    sendPushNotifications(snapTitle);

    res.json({ success: true, message: 'Push notification triggered for testing.' });
});

const workoutsPath = path.join(__dirname, 'workouts');
app.get("/workouts", function (req, res) {
    fs.readdir(workoutsPath, (err, files) => {
        if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
          return;
        }
    
        const workouts = [];
    
        files.forEach(file => {
          const filePath = path.join(workoutsPath, file);
          const workoutData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          workouts.push(workoutData);
        });
    
        res.json(workouts);
      });
      
});

//push notification
let subscriptions = [];
const SUBS_FILENAME = 'subscriptions.json';
try {
    subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
} catch (error) {
    console.error(error);    
}

app.post("/saveSubscription", function(req, res) {
    console.log(req.body);
    let sub = req.body.sub;
    subscriptions.push(sub);
    fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
    res.json({
        success: true
    });
});

async function sendPushNotifications(snapTitle) {
    webpush.setVapidDetails('mailto:ema.vlainic@fer.hr', 
    'BGuwPxovpo6HgWgLbnZIyE5L89YJQsIuZ0Ptmn3dTabFAzAfzQHcGbDYTwMSku-1dlgzETjnINWu2IEat5stNMc', 
    'tGIbLuAZQCERqyxYwy3lySYC9i_J8gY_GxS67ylH6yA');
    subscriptions.forEach(async sub => {
        try {
            console.log("Sending notif to", sub);
            await webpush.sendNotification(sub, JSON.stringify({
                title: 'New workout!',
                body: 'Somebody just added a new workout: ' + snapTitle,
                redirectUrl: '/index.html'
              }));    
        } catch (error) {
            console.error(error);
        }
    });
}




app.listen(port, () => {
  console.log(`Server listening at port:${port}`);
});
