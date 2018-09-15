const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// Models
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');

// Validation
const validatePostInput = require('../../validation/post');

// @route   GET api/posts/test
// @desc    Tests post route
// @access  Public
router.get('/test', (req, res) => res.json({
    msg: "Posts Works"
}));


// @route   GET api/posts
// @desc    Get posts
// @access  Public
router.get('/', (req, res) => {
    Post.find()
        .sort({
            date: -1
        })
        .then(posts => res.json(posts))
        .catch(err => res.status(404).json({
            noPostsFound: 'No posts found by that id'
        }));
});

// @route   GET api/posts/:id
// @desc    Get post by id
// @access  Public
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => res.json(post))
        .catch(err => res.status(404).json({
            noPostFound: 'No post found by that id'
        }));
});

// @route   GET api/posts
// @desc    Create a post
// @access  Private
router.post('/', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    const {
        errors,
        isValid
    } = validatePostInput(req.body);

    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    });

    newPost.save().then(post => res.json(post));
});

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findOne({
            user: req.user.id
        })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check for post owner
                    if (post.user.toString() !== req.user.id) {
                        return res.status(401).json({
                            notAuthorized: 'User not authorized'
                        });
                    }

                    // Delete
                    post.remove()
                        .then(() => res.json({
                            success: true
                        }))
                        .catch(err => res.status(404).json({
                            postNotFound: 'No post found '
                        }));
                });
        })
});

// @route   POST api/posts/like/:id
// @desc    Like a post
// @access  Private
router.post('/like/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findOne({
            user: req.user.id
        })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    if (post.likes.filter(like => like.user.toString() !== req.user.id).length > 0) {
                        return res.status(400).json({
                            alreadyLiked: 'User already liked this post'
                        });
                    }

                    // Add user id to likes array
                    post.likes.unshift({
                        user: req.user.id
                    });
                    post.save().then(post => res.json(post));

                })
        })
});

// @route   POST api/posts/unlike/:id
// @desc    Unlike a post
// @access  Private
router.post('/unlike/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findOne({
            user: req.user.id
        })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    if (post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
                        return res.status(400).json({
                            notLiked: 'You have not yet liked this post'
                        });
                    }

                    // Get the remove index
                    const removeIndex = post.likes
                        .map(item => item.user.toString())
                        .indexOf(req.user.id);

                    // Remove from array
                    post.likes.splice(removeIndex, 1);
                    post.save().then(post => res.json(post));

                })
        });
});

// @route   POST api/posts/comment/:id
// @desc    Add a comment to post
// @access  Private
router.post('/comment/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    const {
        errors,
        isValid
    } = validatePostInput(req.body);

    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    Profile.findById(req.params.id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }

            // Add to comments array
            post.comments.unshift(newComment);
            post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({
            postNotFound: 'No post found'
        }));
});

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Delete comment from post
// @access  Private
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findById(req.params.id)
        .then(post => {
            if (post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
                return res.status(404).json({
                    commentNotFoun: 'Comment does not exist'
                })
            }

            // Get index to remove
            const removeIndex = post.comments
                .map(item => item._id.toString())
                .indexOf(req.params.comment_id);

            post.comments.splice(removeIndex, 1);
            post.save().then(pots => res.json(post));
        })
        .catch(err => res.status(404).json({
            postNotFound: 'No post found'
        }));
});

module.exports = router;