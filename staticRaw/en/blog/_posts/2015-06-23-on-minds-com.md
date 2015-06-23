---
title: Encryption on minds.com - Error 404 not found
layout: blogarticle
author: Nils Kenneweg
authorMail: nils@whispeer.de
---

The recent press talked a lot about minds.com, the social network backed by anonymous, which encrypts your messages!
Of course I was interested and took a closer look on it.
When I opened the message view, I was prompted for a secondary password to encrypt those messages. After entering it, I started writing my first message to my other test account. Sending and receiving those messages was easy as promised, but I was a little confused as it was also possible without entering a password.

Of course I know took a closer look. At first glance it looked like the standard js library for rsa encryption was used (found here: https://www.minds.com/mod/gatherings/vendors/jcryption.js)
After taking a closer look I realized that no encryption was used at all. When entering my password, it was transferred to the server directly, encryption on the client was not happening at all. Also the client was not storing my password, so as long as any open session with my password exists, it is stored somewhere on the server side. All of this is bad, especially as one can not check which kind of server code minds is actually running and how they are encrypting messages from one user to another. Open Source does not help at all, because there could still be different code running on the minds.com server (code which would save your password). Also I was unable to locate the Source Code of minds.

All in all I was very disappointed, as I was hoping to find encryption at least on the level of whistle.im, but minds.com does not even try at all.
To summarize the problems:
- no encryption on the users device
- all messages and the "encryption" password are sent to the server
- encryption on the server is unprovable, even if the source code would be available
