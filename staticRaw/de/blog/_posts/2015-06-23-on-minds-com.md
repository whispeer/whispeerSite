---
title: Encryption on minds.com - Error 404 not found
layout: blogarticle
author: Nils Kenneweg
authorMail: nils@whispeer.de
---

The recent press talked a lot about minds.com, the social network backed by anonymous, which encrypts your messages!
Of course I was interested and took a closer look on it. When I opened the message view, I was prompted for a secondary password to encrypt those messages. After entering it, I started writing my first message to my other test account. Sending and receiving those messages was easy as promised, but I was confused as I re-opened the page after clearing my cache, that I did not have to re-enter the encryption password but only the account password. That made me take a closer look on the network traffic sent and voila, there it was: my messages were sent to the server in plain text, so was my password. If my password is used in a later part to encrypt the messages, it is still stored on the server forever, as I did not have to re-enter it when logging in again. Of course all of this is not provable at all. I have no way to check if my messages are encrypted at all, as I can not look into the servers run by minds. Open Source does not help at all here because minds.com could be running any code on their servers they want.
