const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const users = require('./user');
const boards = require('./board');

mongoose.connect('mongodb://' + process.env.IP + ':27017/board');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connect err'));
db.once('open', function() {
  console.log('mongo connected');
});

let loginuser = {
  email: undefined,
  name: undefined
};

function isLogin(req, res, next) {
  if (req.session.email != loginuser.email && req.session.email != undefined)
    return next();
  res.render('loginMessage', { email: 'undefined' });
}

//메인 화면
router.get('/', (req, res) => {
  boards.find({}, function(err, docs) {
    res.render('main', {
      email: req.session.email ? req.session.email : 'undefined',
      answer: docs
    });
  });
});

//로그인 화면
router.get('/signin', (req, res) => {
  req.session.destroy();
  res.render('signin', { email: 'undefined' });
});

//로그인 요청
router.post('/signin', (req, res) => {
  let user = { email: req.body.email, password: req.body.password };
  users.find(user, function(err, docs) {
    if (err) console.log(err);
    if (docs.length > 0) {
      console.log(docs[0].email + '이 로그인함');
      req.session.name = docs[0].name;
      req.session.email = docs[0].email;
      loginuser.name = docs[0].name;
      loginuser.email = docs[0].email;

      res.redirect('/');
    }
    else {
      res.render('loginFail', { email: 'undefined' });
    }
  });
});

//로그아웃
router.get('/signout', (req, res) => {
  req.session.destroy();
  loginuser = {
    email: undefined,
    name: undefined
  };
  res.redirect('/');
});

//회원가입 화면
router.get('/signup', (req, res) => {
  req.session.destroy();
  res.render('signup', {
    email: 'undefined'
  });
});

//회원가입 요청
router.post('/signup', (req, res) => {
  let userInfo = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.name
  };

  users.find({ email: userInfo.email }, function(err, docs) {
    if (err) console.log(err);
    if (docs.length == 0) {
      let user = new users(userInfo);
      user.save(function(err) {
        if (err) console.log(err);
        else res.render('signupSuccess', { email: 'undefined' });
      });
    }
    else {
      res.render('signupFail', { email: 'undefined' });
    }
  });
});

//질문하기 화면
router.get('/asking', isLogin, (req, res) => {
  res.render('asking', {
    name: req.session.name,
    email: req.session.email ? req.session.email : 'undefined'
  });
});

//질문하기 등록 요청
router.post('/asking', isLogin, (req, res) => {
  let boardInfo = {
    email: req.session.email,
    name: req.session.name,
    title: req.body.title,
    context: req.body.questionContext,
  };
  console.log(boardInfo);
  let board = new boards(boardInfo);
  board.save(function(err) {
    if (err) console.log(err);
    else res.redirect('/answer');
  });
});

//질답 화면
router.get('/answer', (req, res) => {
  let answerId = req.query.qnumber;
  boards.find({ _id: answerId }, function(err, docs) {
    if (docs.length == 0)
      res.redirect('/');
    else {
      res.render('answer', {
        name: req.session.name,
        email: req.session.email ? req.session.email : 'undefined',
        answer: docs[0],
        comments: docs[0].comments
      });
    }
  });
});

//질문 수정 화면
router.get('/answer/update', isLogin, (req, res) => {
  let qnumber = req.query.qnumber;
  boards.find({ _id: qnumber }, function(err, docs) {
    if (docs.length == 0)
      res.redirect('/');
    else if (req.session.email != docs[0].email) {
      res.redirect('/');
    }
    else
      res.render('qupdate', {
        name: req.session.name,
        email: req.session.email,
        qnumber: qnumber,
        title: docs[0].title,
        context: docs[0].context
      });
  });
});

//질문 수정
router.post('/answer/:qnumber', isLogin, (req, res) => {
  let qnumber = req.params.qnumber;
  //let context = req.body.questionContext.replace(/\r\n/g, '<br/>');
  boards.findById(qnumber, function(err, question) {
    if (err) return res.status(500).json({ error: 'db failure' });
    if (!question) res.status(404).json({ error: 'board not found' });

    question.email = req.session.email;
    question.name = req.session.name;
    question.title = req.body.title;
    question.context = req.body.questionContext;

    question.save(function(err) {
      if (err) return res.status(500).json({ error: 'db failure' });
      res.redirect('/answer?qnumber=' + qnumber);
    });
  });
});

//질문 삭제
router.delete('/answer', isLogin, (req, res) => {
  let answerId = req.body.qnumber;
  boards.remove({ _id: answerId }, function(err, docs) {
    if (err) {
      console.log(err);
      res.send({ result: false });
    }
    else {
      res.send({ result: true });
    }
  });
});

//답변 등록
router.post('/addComment', isLogin, (req, res) => {
  let qnumber = req.body.qnumber;
  let comment = {
    email: req.session.email,
    name: req.session.name,
    context: req.body.context
  };

  boards.update({ _id: qnumber }, { $push: { comments: comment } },
    function(err, docs) {
      if (err) {
        console.log(err);
        res.send({ result: false })
      }
      else res.send({ result: true });
    });
});

//답변 삭제 -> 삭제하면 글 내용만 삭제되고 하위 답변은 그대로 있음
router.delete('/delComment/:qnumber/:cnumber', isLogin, function(req, res) {
  let qnumber = req.params.qnumber;
  let cnumber = req.params.cnumber;

  boards.findOne({ _id: qnumber }, function(err, docs) {
    reboard = docs;
    for (let i = 0; i < reboard.comments.length; i++) {
      if (reboard.comments[i]._id == cnumber) {
        if (reboard.comments[i].recomments.length != 0) {
          reboard.comments[i].email = '-';
          reboard.comments[i].name = '-';
          reboard.comments[i].context = '해당 답변은 삭제되었습니다.';
          reboard.comments[i].date = '-';

          boards.update({ _id: qnumber }, reboard, function(err, docs) {
            if (err)
              console.log(err);
            res.send(true);
          });
        }
        else { //하위 답변이 없을 때
          reboard.comments.splice(i, 1);

          boards.update({ _id: qnumber }, reboard, function(err, docs) {
            if (err)
              console.log(err);
            res.send(true);
          });
        }
      }
    }
  });
});

//답변 수정
router.post('/updateComment/:qnumber/:cnumber', isLogin, function(req, res) {
  let qnumber = req.params.qnumber;
  let cnumber = req.params.cnumber;
  let reAnswerContext = req.body.reAnswerContext;

  boards.findOne({ _id: qnumber }, function(err, docs) {
    reboard = docs;
    for (let i = 0; i < reboard.comments.length; i++) {
      if (reboard.comments[i]._id == cnumber) {
        reboard.comments[i].context = reAnswerContext;

        boards.update({ _id: qnumber }, reboard, function(err, docs) {
          if (err)
            console.log(err);
          res.redirect(`/answer?qnumber=${qnumber}`);
        });
      }
    }
  });
});

//답변의 답변 등록 요청
router.post('/addReComment/:qnumber/:cnumber', isLogin, (req, res) => {
  let qnumber = req.params.qnumber;
  let cnumber = req.params.cnumber;
  let recomments = {
    email: req.session.email,
    name: req.session.name,
    context: req.body.reAnswerContext
  };

  boards.findOne({ _id: qnumber }, function(err, docs) {
    reboard = docs;
    for (let i = 0; i < reboard.comments.length; i++) {
      if (reboard.comments[i]._id == cnumber) {
        reboard.comments[i].recomments.push(recomments);

        boards.update({ _id: qnumber }, reboard, function(err, docs) {
          if (err)
            console.log(err);
          res.redirect(`/answer?qnumber=${qnumber}`);
        });
      }
    }
  });
});

//답변의 답변 삭제 -> 걍 삭제
router.delete('/delReComment/:qnumber/:rnumber', isLogin, function(req, res) {
  let qnumber = req.params.qnumber;
  let rnumber = req.params.rnumber;

  boards.findOne({ _id: qnumber }, function(err, docs) {
    reboard = docs;
    for (let i = 0; i < reboard.comments.length; i++) {
      for (let j = 0; j < reboard.comments[i].recomments.length; j++) {
        if (reboard.comments[i].recomments[j]._id == rnumber) {
          reboard.comments[i].recomments.splice(j, 1);

          boards.update({ _id: qnumber }, reboard, function(err, docs) {
            if (err)
              console.log(err);
            res.send(true);
          });
        }
      }
    }
  });
});

//답변의 답변 수정
router.post('/updateReComment/:qnumber/:rnumber', isLogin, function(req, res) {
  let qnumber = req.params.qnumber;
  let rnumber = req.params.rnumber;
  let reAnswerContext = req.body.reAnswerContext;

  boards.findOne({ _id: qnumber }, function(err, docs) {
    reboard = docs;
    for (let i = 0; i < reboard.comments.length; i++) {
      for (let j = 0; j < reboard.comments[i].recomments.length; j++) {
        if (reboard.comments[i].recomments[j]._id == rnumber) {
          reboard.comments[i].recomments[j].context = reAnswerContext;

          boards.update({ _id: qnumber }, reboard, function(err, docs) {
            if (err)
              console.log(err);
            res.redirect(`/answer?qnumber=${qnumber}`);
          });
        }
      }
    }
  });
});


module.exports = router;
