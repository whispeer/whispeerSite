# whispeer Blog - How To Use
1. Create new Markdown file in the blog/_post directory of your desired language (ex: staticRaw/de/blog/_post)
	1. staticRaw is the general Subfolder for our raw jekyll files, those will get compiled!
2. The Markdown file has to be conform to the following naming convention:
	1. YYYY-MM-DD-title-of-post.md (ex: 2015-09-13-this-is-a-test-title.md)
3. Now that we've got the file, let's start filling it with Content. You can wirte normal markdown as well as html in here. But first of all we will add some Metadata.

```
---
title: Post Title
layout: blogarticle
author: Your Name
authorMail: Your Mail (preferably @whispeer.de)
---
```
Now you can start writing your post.

If you only want an excerpt of your post to be displayed on the blog home page, just add

```
 <!--more-->
```
At some point in your markdown. Everything until this Tag will be displayed, everything else will be cut off an only showed when viewing the whole article.