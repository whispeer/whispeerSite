---
title: Encryption on minds.com
layout: blogarticle
author: Nils Kenneweg
authorMail: nils@whispeer.de
---

### Sending messages on minds

Minds.com was mentioned a lot in the recent press as the social network backed by anonymous, which encrypts your messages!
Of course I was interested and took a closer look on it.
When I opened the message view, I was prompted for a secondary password to encrypt my messages. After entering it, I started writing my first message to my other test account. Sending and receiving those messages was easy as promised, even though the "encryption" sometimes broke and I had to enter a new password.

<!--more-->

### Diving deeper

Next I took a closer look. At first glance it looked like a typical library for rsa encryption was used (found here: https://www.minds.com/mod/gatherings/vendors/jcryption.js)
So I opened my network manager to inspect the data being sent. There it struck me, the data was not encrypted on the client side, it was transferred to the server using only transport encryption (TLS). Same for the user password.

<img src="/assets/images/blog/password_cleartext.png">

The user password is passed in cleartext (passphrase: "test")

<img src="/assets/images/blog/message_cleartext.png">

All messages are passed in cleartext (message: "Heyho")

It might be true, that minds.com encrypts the messages on the server side, but this is not provable at all and might also be false.
Also I can reload the page without the password being resend, meaning that somewhere on the minds.com servers my password is being saved.
This in fact destroys all of the encryption promises. Obivously, the minds.com admins can still get to my private messages, they can remove the encryption as they please and they can decrypt it even if I am not using minds, as long as the password is still stored somewhere.

As of today (30th of June 2015) I was also unable to localize the Source Code of minds.com.

### Summary - encryption not found

All in all I was very disappointed, as I was hoping to find encryption at least on the level of whistle.im, but minds.com does not even try at all.
To summarize the problems:
- no encryption on the users device
- all messages and the "encryption" password are sent to the server
- encryption on the server is unprovable, even if the source code would be available and might not exist at all
