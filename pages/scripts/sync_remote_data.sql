PRAGMA defer_foreign_keys=TRUE;
INSERT INTO Mail VALUES(1,'[{"key":"received","value":"from mail-yb1-xb2b.google.com (2607:f8b0:4864:20::b2b) by cloudflare-email.net (unknown) id Q2Zpt0ucrXTs for <test@hocg.in>; Mon, 06 May 2024 01:28:19 +0000"},{"key":"arc-seal","value":"i=1; a=rsa-sha256; s=2023; d=cloudflare-email.net; cv=none; b=Cj1d0YkKb29quJmCcJD0n40gMlWJKBT5/3My1w0OGTbrhkcXU1vmTeZmnKIcBO7v9W01hMIz0 JHxnhd1yssHe+RsXg6FlVD9cARZ5OMPMEcm6tPkuE62yOZqqXhIhoVIsiTl1L3SB3yFcXObI/Ja B3yEbY++4fufKs/LbN8EGKpxXxELzBir3wpcMSXSlW9EvfOmMnmfauoUN4NdwUWwsyf7E/l5tST ZCP2tXujrNOPeFH2g8+becvRWupZLnQJ82cBcHWrs/f2OpTNP237ypgUQTMu/ooHT2KEspmswb5 wSrL7HrzKuhIQgpBwZpXdkvF5zDQNWv2CfuqHrRBz7VQ==;"},{"key":"arc-message-signature","value":"i=1; a=rsa-sha256; s=2023; d=cloudflare-email.net; c=relaxed/relaxed; h=To:Subject:Date:From:In-Reply-To:References:reply-to:cc:resent-date :resent-from:resent-to:resent-cc:list-id:list-help:list-unsubscribe :list-subscribe:list-post:list-owner:list-archive; t=1714958899; x=1715563699; bh=ERv+drIHvKFZJKXTK+lsHRx48oV5FW6r1ipMtRIf7+s=; b=dhhfmI/I+M 4loSTiTWeZEZS4opJ22OM33xk5fMNd1RhYDlDmwogdsHL9+vnqqnyNO7JjedaJOrm7hLBNDcQwQ gjrO0CcDkEBdkDOUNPTNLsgIXtJaa/CyHNl+ByfNSraTjKnnqlBLF7NE1RboQ9SauwgP1G5Mqxo zILbEqObMUsWnLqSC3TCOWvRSGtYPzYHMNBR/R4RQTHiBBYQ5JlqAEg27o8PwEVzXO+XCXXmv9I fGF8zBD4msn65/oZgRtrvLwOWM+n3mSSw6s5m8c++xTGGCpDw2Ce0JP4Nb1P3dOWu0INY4f/i4I AXz9GDW4tq/mmjvzfBy3ZXNdQAW/W+KA==;"},{"key":"arc-authentication-results","value":"i=1; mx.cloudflare.net; dkim=pass header.d=gmail.com header.s=20230601 header.b=WvRvNRTX; dmarc=pass header.from=gmail.com policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-yb1-xb2b.google.com) smtp.helo=mail-yb1-xb2b.google.com; spf=pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2b as permitted sender) smtp.mailfrom=hocgin@gmail.com; arc=none smtp.remote-ip=2607:f8b0:4864:20::b2b"},{"key":"received-spf","value":"pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2b as permitted sender) receiver=mx.cloudflare.net; client-ip=2607:f8b0:4864:20::b2b; envelope-from=\"hocgin@gmail.com\"; helo=mail-yb1-xb2b.google.com;"},{"key":"authentication-results","value":"mx.cloudflare.net; dkim=pass header.d=gmail.com header.s=20230601 header.b=WvRvNRTX; dmarc=pass header.from=gmail.com policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-yb1-xb2b.google.com) smtp.helo=mail-yb1-xb2b.google.com; spf=pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2b as permitted sender) smtp.mailfrom=hocgin@gmail.com; arc=none smtp.remote-ip=2607:f8b0:4864:20::b2b"},{"key":"received","value":"by mail-yb1-xb2b.google.com with SMTP id 3f1490d57ef6-d9b9adaf291so1263176276.1 for <test@hocg.in>; Sun, 05 May 2024 18:28:19 -0700 (PDT)"},{"key":"dkim-signature","value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=gmail.com; s=20230601; t=1714958899; x=1715563699; darn=hocg.in; h=to:subject:message-id:date:from:in-reply-to:references:mime-version :from:to:cc:subject:date:message-id:reply-to; bh=ERv+drIHvKFZJKXTK+lsHRx48oV5FW6r1ipMtRIf7+s=; b=WvRvNRTXbixeI5m6orrHvCHDga0wLKn+54Au54eF5SXuM0HJvNN/0zdtQJK313nhyk x5x9OqAbfvWA0PDSalTtjEvKUGlw2YnyPXR2bhwu36I7THkyk4HUuHVuR1RoxKEENm75 pbnqEweGwvf42nf5eRBWsR9iMDZ+4EoCW+0WFHpBr4dL1wRQCOKEcyhMKKcJXjcE53jQ JbmymGtr/rkh9RyCgA98T2UoCaJjlg6kGuAOUmSf9l72C5s3RYAENm3tIXvwY9EbfOcp f6t4sSn2cnC6RFJ81yMZxNWjpY/yyfTw35+jHRK8FDUmBgSQPN1aN50oBQVwPxLr5ri0 Y0iA=="},{"key":"x-google-dkim-signature","value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=1e100.net; s=20230601; t=1714958899; x=1715563699; h=to:subject:message-id:date:from:in-reply-to:references:mime-version :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to; bh=ERv+drIHvKFZJKXTK+lsHRx48oV5FW6r1ipMtRIf7+s=; b=OYVCfGytxgcUlmRYtScP8AAwdcrOv5ir+/m65VXxPsCqIyVGqzkxrI5x6EbfK0zL4J oXoeG1v1C0/kB81HdghG0TIY9CvedSOMcTMN/3wavuHe/1IaAStkCsb3uxjcDDpRiCz4 H4ELCq3G2d5QyNLRvBT3Hh8MhWANhVraMo/RhridL6erNUhyRtBI07xwYvsN8zcOQ9Lo eoqwo1LejmRtIUW25GkPYbdQ0BQZJQfYbLinVCKV6PI36giADHSU4sxD1W8RAzz5XjqS IyuWhHEbfwtjUJ4QUkajFUoXl/qEtqO8VoPArid6CQ44o44GMjNaozae3b5nsL8T2PwI Hd4g=="},{"key":"x-gm-message-state","value":"AOJu0Yzqyb8pNa6jPBH8X+0FxJnm1EXBcK+egOayyPJYjehWfPdd+3MP uFwiV/VhNjHBd+79YnCdLLeU/nJS5b/Bo+d9ve9cVDtjPYGy5pKlF51CdZEuLQ95U18vSgOrTRQ xP+W4Rc+bXAJVubmiMLiUfTkv/wfnxNClLNdzgg=="},{"key":"x-google-smtp-source","value":"AGHT+IGHje3eZVNDEvH7KtouwdnXPhjcueDL+cmqZGRBZv27ATi+H8FRRcASB5qlTwKd2pdcOenFiJZ6kVdeHLziIfY="},{"key":"x-received","value":"by 2002:a25:ac1a:0:b0:de0:d515:259b with SMTP id w26-20020a25ac1a000000b00de0d515259bmr7639235ybi.59.1714958898218; Sun, 05 May 2024 18:28:18 -0700 (PDT)"},{"key":"mime-version","value":"1.0"},{"key":"references","value":"<0100018f48461d24-5aae9b65-849e-4050-965b-6b567edbfc8a-000000@email.amazonses.com>"},{"key":"in-reply-to","value":"<0100018f48461d24-5aae9b65-849e-4050-965b-6b567edbfc8a-000000@email.amazonses.com>"},{"key":"from","value":"=?UTF-8?B?5aSP5LiN5p2l?= <hocgin@gmail.com>"},{"key":"date","value":"Mon, 6 May 2024 09:28:05 +0800"},{"key":"message-id","value":"<CAPGKVH9rWo5A0tpSqzkTMZpH6Td4LbaYC3HHp20Wk3hcNbbf3w@mail.gmail.com>"},{"key":"subject","value":"Fwd: [Feeder] What''s new"},{"key":"to","value":"test@hocg.in"},{"key":"content-type","value":"multipart/alternative; boundary=\"000000000000eece250617befbcd\""}]','{"address":"hocgin@gmail.com","name":"夏不来"}',NULL,NULL,NULL,NULL,'[{"address":"test@hocg.in","name":""}]',NULL,NULL,'Fwd: [Feeder] What''s new','<CAPGKVH9rWo5A0tpSqzkTMZpH6Td4LbaYC3HHp20Wk3hcNbbf3w@mail.gmail.com>','<0100018f48461d24-5aae9b65-849e-4050-965b-6b567edbfc8a-000000@email.amazonses.com>','<0100018f48461d24-5aae9b65-849e-4050-965b-6b567edbfc8a-000000@email.amazonses.com>','2024-05-06T01:28:05.000Z',replace('<div dir="ltr"><div class="gmail_quote"><br><u></u>\n\n  \n    \n  \n\n  <div>\n    <div style="max-width:540px;font-family:sans-serif;font-size:16px;margin:0 auto">\n  <p style="padding-bottom:10px;margin-bottom:10px">\n      Private Feed for hocgin ·\n    What&#39;s new\n    <br>\n    <b>May 05, 2024</b>\n  </p>\n\n\n  <hr style="border-top-width:1px;border-top-color:#eeeff0;margin-bottom:16px;border-style:solid none none">\n\n  <div>\n      <div>\n        <div style="margin-bottom:16px">\n          <div style="color:#707070;margin-bottom:4px;font-size:0.85em">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=bf815ea74ae65949a8553f08ede981ab8175c82b&amp;url=https%3A%2F%2Fgithub.com%2FBOCOVO%2Fdb-schema-visualizer" style="color:#707070;text-decoration:none" target="_blank">github.com</a>\n            \n            ·\n\n              04 May 13:52\n          </div>\n\n          <table style="border-collapse:collapse">\n            <tbody style="border-collapse:collapse">\n              <tr><td style="border-collapse:collapse;width:100%" valign="top">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=55fe7917b16f4419437c2ac79bfdd09884e11f78&amp;url=https%3A%2F%2Ffeeder.co%2Fp%2F7bc0c4e8-0a21-11ef-a32c-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8" style="text-decoration:none;color:#707070" target="_blank">\n                  <b style="font-size:1.2em;display:block;color:#1a1a1a;line-height:1.2em">\n                    alswl starred BOCOVO/db-schema-visualizer\n                  </b>\n                </a>\n                  <div style="font-size:0.85em;color:#707070;margin-top:0.5em;line-height:1.4em">\n                    alswl             starred             BOCOVO/db-schema-visualizer                            · May 4, 2024 13:52                                                                                 BOCOVO/db-schema-visualizer                                   An Vscode extension...\n                  </div>\n              </td>\n                <td valign="top" style="border-collapse:collapse">\n                  <img src="https://avatars.githubusercontent.com/u/227562?s=64&amp;v=4" style="border-radius:4px;margin-left:8px;height:75px" height="75">\n                </td></tr>\n            </tbody>\n          </table>\n        <hr style="border-top-width:1px;border-top-color:#eeeff0;margin-top:16px;border-style:solid none none">\n        </div>\n      </div>\n      <div>\n        <div style="margin-bottom:16px">\n          <div style="color:#707070;margin-bottom:4px;font-size:0.85em">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=f7bd39f4724ae9a1aa747db68ff36f5afa675fe7&amp;url=https%3A%2F%2Fgithub.com%2FNayamAmarshe" style="color:#707070;text-decoration:none" target="_blank">github.com</a>\n            \n            ·\n\n              05 May 08:07\n          </div>\n\n          <table style="border-collapse:collapse">\n            <tbody style="border-collapse:collapse">\n              <tr><td style="border-collapse:collapse;width:100%" valign="top">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=28aa55d7ee4cc5bf8949b8491ec817213e131527&amp;url=https%3A%2F%2Ffeeder.co%2Fp%2F6e4c3ea8-0ab8-11ef-bd11-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8" style="text-decoration:none;color:#707070" target="_blank">\n                  <b style="font-size:1.2em;display:block;color:#1a1a1a;line-height:1.2em">\n                    xiaoluoboding started following NayamAmarshe\n                  </b>\n                </a>\n                  <div style="font-size:0.85em;color:#707070;margin-top:0.5em;line-height:1.4em">\n                    xiaoluoboding             started following               NayamAmarshe                            · May 5, 2024 08:07                                                                                                                                          NayamAmarshe                                                                          FOSS is...\n                  </div>\n              </td>\n                <td valign="top" style="border-collapse:collapse">\n                  <img src="https://avatars.githubusercontent.com/u/6118824?s=64&amp;v=4" style="border-radius:4px;margin-left:8px;height:75px" height="75">\n                </td></tr>\n            </tbody>\n          </table>\n        <hr style="border-top-width:1px;border-top-color:#eeeff0;margin-top:16px;border-style:solid none none">\n        </div>\n      </div>\n      <div>\n        <div style="margin-bottom:16px">\n          <div style="color:#707070;margin-bottom:4px;font-size:0.85em">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=511c33223ae75d70ed7ed57a1587588c91e88965&amp;url=https%3A%2F%2Fgithub.com%2Fsindresorhus%2Fmerge-streams%2Freleases%2Ftag%2Fv4.0.0" style="color:#707070;text-decoration:none" target="_blank">github.com</a>\n            \n            ·\n\n              04 May 19:41\n          </div>\n\n          <table style="border-collapse:collapse">\n            <tbody style="border-collapse:collapse">\n              <tr><td style="border-collapse:collapse;width:100%" valign="top">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=24573dfbab158538e4d83228f211dbbaf4a999cf&amp;url=https%3A%2F%2Ffeeder.co%2Fp%2Fc91ae02c-0a53-11ef-b1f2-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8" style="text-decoration:none;color:#707070" target="_blank">\n                  <b style="font-size:1.2em;display:block;color:#1a1a1a;line-height:1.2em">\n                    sindresorhus released v4.0.0 at sindresorhus/merge-streams\n                  </b>\n                </a>\n                  <div style="font-size:0.85em;color:#707070;margin-top:0.5em;line-height:1.4em">\n                    sindresorhus                    released         v4.0.0           of           sindresorhus/merge-streams                    · May 4, 2024 19:41                                                                                                                      sindresorhus /...\n                  </div>\n              </td>\n                <td valign="top" style="border-collapse:collapse">\n                  <img src="https://avatars.githubusercontent.com/u/170270?s=64&amp;v=4" style="border-radius:4px;margin-left:8px;height:75px" height="75">\n                </td></tr>\n            </tbody>\n          </table>\n        <hr style="border-top-width:1px;border-top-color:#eeeff0;margin-top:16px;border-style:solid none none">\n        </div>\n      </div>\n      <div>\n        <div style="margin-bottom:16px">\n          <div style="color:#707070;margin-bottom:4px;font-size:0.85em">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=d5a5d59fcd33da3a9230fee42e4fee41c4ec6ec9&amp;url=https%3A%2F%2Fgithub.com%2Falswl%2Fdbml-editor%2Freleases%2Ftag%2Fv0.2.0" style="color:#707070;text-decoration:none" target="_blank">github.com</a>\n            \n            ·\n\n              04 May 13:31\n          </div>\n\n          <table style="border-collapse:collapse">\n            <tbody style="border-collapse:collapse">\n              <tr><td style="border-collapse:collapse;width:100%" valign="top">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=cece9dedb8b47ea7eeb5cd6a251e32a7c3e26912&amp;url=https%3A%2F%2Ffeeder.co%2Fp%2F7bca0af3-0a21-11ef-a32e-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8" style="text-decoration:none;color:#707070" target="_blank">\n                  <b style="font-size:1.2em;display:block;color:#1a1a1a;line-height:1.2em">\n                    alswl released v0.2.0 at alswl/dbml-editor\n                  </b>\n                </a>\n                  <div style="font-size:0.85em;color:#707070;margin-top:0.5em;line-height:1.4em">\n                    alswl                    released         v0.2.0           of           alswl/dbml-editor                    · May 4, 2024 13:31                                                                                                                      alswl /...\n                  </div>\n              </td>\n                <td valign="top" style="border-collapse:collapse">\n                  <img src="https://avatars.githubusercontent.com/u/227562?s=64&amp;v=4" style="border-radius:4px;margin-left:8px;height:75px" height="75">\n                </td></tr>\n            </tbody>\n          </table>\n        <hr style="border-top-width:1px;border-top-color:#eeeff0;margin-top:16px;border-style:solid none none">\n        </div>\n      </div>\n      <div>\n        <div style="margin-bottom:16px">\n          <div style="color:#707070;margin-bottom:4px;font-size:0.85em">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=108b1942a62f7fa9193742c533249041fcb11cb9&amp;url=https%3A%2F%2Fgithub.com%2Fnerdyman%2Freact-compare-slider" style="color:#707070;text-decoration:none" target="_blank">github.com</a>\n            \n            ·\n\n              05 May 08:04\n          </div>\n\n          <table style="border-collapse:collapse">\n            <tbody style="border-collapse:collapse">\n              <tr><td style="border-collapse:collapse;width:100%" valign="top">\n                <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=84e96244e59d3bd866860942c975f2d29e2d5f20&amp;url=https%3A%2F%2Ffeeder.co%2Fp%2F6e554352-0ab8-11ef-bd15-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8" style="text-decoration:none;color:#707070" target="_blank">\n                  <b style="font-size:1.2em;display:block;color:#1a1a1a;line-height:1.2em">\n                    xiaoluoboding starred nerdyman/react-compare-slider\n                  </b>\n                </a>\n                  <div style="font-size:0.85em;color:#707070;margin-top:0.5em;line-height:1.4em">\n                    xiaoluoboding             starred             nerdyman/react-compare-slider                            · May 5, 2024 08:04                                                                                 nerdyman/react-compare-slider                                   A slider component...\n                  </div>\n              </td>\n                <td valign="top" style="border-collapse:collapse">\n                  <img src="https://avatars.githubusercontent.com/u/6118824?s=64&amp;v=4" style="border-radius:4px;margin-left:8px;height:75px" height="75">\n                </td></tr>\n            </tbody>\n          </table>\n        <hr style="border-top-width:1px;border-top-color:#eeeff0;margin-top:16px;border-style:solid none none">\n        </div>\n      </div>\n\n      <div style="color:#999;padding:20px 0 30px" align="center">\n        And 4 more stories waiting for you...\n      </div>\n\n      <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=8d0550af4b81c5b18d6af67c2f9026f86497e248&amp;url=https%3A%2F%2Ffeeder.co%2F%3Futm_campaign%3Dpostsummary" target="_blank">\n        Read more\n      </a>\n  </div>\n\n  <p>\n    Regards,<br>\n    <a href="https://feeder.co" target="_blank">Feeder</a>\n  </p>\n\n  <p>\n    <a href="https://feeder.co/newsletter/6a7fb62eb1/unsubscribe" style="color:grey;text-decoration:none;font-size:0.85em" target="_blank">\n      Unsubscribe from What&#39;s new\n    </a>\n  </p>\n\n  <p>\n    <a href="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=9b7eec1ccf5a9ca7ffab46e407017a3ebebcbb86&amp;url=https%3A%2F%2Ffeeder.co%2Fsettings%2Fsummaries" style="color:grey;text-decoration:none;font-size:0.85em" target="_blank">\n      Manage settings\n    </a>\n  </p>\n\n  <img src="https://feeder.co/appsets/logo-no-but-maybe-opening-recognition/3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8.gif" width="1" height="1">\n\n</div>\n\n\n  <img alt="" src="https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/open.gif" width="1" height="1">\n</div>\n\n</div></div>\n\n','\n',char(10)),replace('Private Feed for hocgin · What''s new\n*May 05, 2024*\n------------------------------\ngithub.com\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=bf815ea74ae65949a8553f08ede981ab8175c82b&url=https%3A%2F%2Fgithub.com%2FBOCOVO%2Fdb-schema-visualizer>\n· 04 May 13:52\n* alswl starred BOCOVO/db-schema-visualizer *\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=55fe7917b16f4419437c2ac79bfdd09884e11f78&url=https%3A%2F%2Ffeeder.co%2Fp%2F7bc0c4e8-0a21-11ef-a32c-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8>\nalswl starred BOCOVO/db-schema-visualizer · May 4, 2024 13:52\nBOCOVO/db-schema-visualizer An Vscode extension...\n------------------------------\ngithub.com\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=f7bd39f4724ae9a1aa747db68ff36f5afa675fe7&url=https%3A%2F%2Fgithub.com%2FNayamAmarshe>\n· 05 May 08:07\n* xiaoluoboding started following NayamAmarshe *\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=28aa55d7ee4cc5bf8949b8491ec817213e131527&url=https%3A%2F%2Ffeeder.co%2Fp%2F6e4c3ea8-0ab8-11ef-bd11-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8>\nxiaoluoboding started following NayamAmarshe · May 5, 2024 08:07\nNayamAmarshe FOSS is...\n------------------------------\ngithub.com\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=511c33223ae75d70ed7ed57a1587588c91e88965&url=https%3A%2F%2Fgithub.com%2Fsindresorhus%2Fmerge-streams%2Freleases%2Ftag%2Fv4.0.0>\n· 04 May 19:41\n* sindresorhus released v4.0.0 at sindresorhus/merge-streams *\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=24573dfbab158538e4d83228f211dbbaf4a999cf&url=https%3A%2F%2Ffeeder.co%2Fp%2Fc91ae02c-0a53-11ef-b1f2-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8>\nsindresorhus released v4.0.0 of sindresorhus/merge-streams · May 4, 2024\n19:41 sindresorhus /...\n------------------------------\ngithub.com\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=d5a5d59fcd33da3a9230fee42e4fee41c4ec6ec9&url=https%3A%2F%2Fgithub.com%2Falswl%2Fdbml-editor%2Freleases%2Ftag%2Fv0.2.0>\n· 04 May 13:31\n* alswl released v0.2.0 at alswl/dbml-editor *\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=cece9dedb8b47ea7eeb5cd6a251e32a7c3e26912&url=https%3A%2F%2Ffeeder.co%2Fp%2F7bca0af3-0a21-11ef-a32e-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8>\nalswl released v0.2.0 of alswl/dbml-editor · May 4, 2024 13:31 alswl /...\n------------------------------\ngithub.com\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=108b1942a62f7fa9193742c533249041fcb11cb9&url=https%3A%2F%2Fgithub.com%2Fnerdyman%2Freact-compare-slider>\n· 05 May 08:04\n* xiaoluoboding starred nerdyman/react-compare-slider *\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=84e96244e59d3bd866860942c975f2d29e2d5f20&url=https%3A%2F%2Ffeeder.co%2Fp%2F6e554352-0ab8-11ef-bd15-1a21cf3a468a%3Fu%3D3c52662a-b4a0-4bf4-8efe-dd84f0fa26a8>\nxiaoluoboding starred nerdyman/react-compare-slider · May 5, 2024 08:04\nnerdyman/react-compare-slider A slider component...\n------------------------------\nAnd 4 more stories waiting for you...\nRead more\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=8d0550af4b81c5b18d6af67c2f9026f86497e248&url=https%3A%2F%2Ffeeder.co%2F%3Futm_campaign%3Dpostsummary>\n\nRegards,\nFeeder <https://feeder.co>\n\nUnsubscribe from What''s new\n<https://feeder.co/newsletter/6a7fb62eb1/unsubscribe>\n\nManage settings\n<https://feeder.co/ahoy/messages/f98Ykb6s0RGn31b61ODbeVJp4ChI37g9/click?signature=9b7eec1ccf5a9ca7ffab46e407017a3ebebcbb86&url=https%3A%2F%2Ffeeder.co%2Fsettings%2Fsummaries>\n\n','\n',char(10)),'[]','test@hocg.in',1,0,0,'2024-05-06 01:28:20','2024-05-06T01:28:27.279+00:00');
INSERT INTO Mail VALUES(2,'[{"key":"received","value":"from mail-yb1-xb2d.google.com (2607:f8b0:4864:20::b2d) by cloudflare-email.net (unknown) id 55KaGlhuUnkZ for <test@hocg.in>; Mon, 06 May 2024 01:30:16 +0000"},{"key":"arc-seal","value":"i=1; a=rsa-sha256; s=2023; d=cloudflare-email.net; cv=none; b=os3tp+xlAkER3Rq2LTi9zh01C0VUeXcv7LBLd8Jhmn9lmT22nt2/EHPQ2i8/FFhKo4EtnXZhF anGDdG8/sawmLBldd2AS7unFgoSjPMsqGHvbvsPXFsNRnWXl6T/puD+z4oa+C4eb68DVygNsyxe 7PaNw4vDTKr08VRQ8fHSxkgeEfHCQKu790XGrVA69H4pQlbX42ygX45ay0oC+TMBA3xsjTcfJLg eMXzgbzLJlxzUhVXvmpKtrb96FKhkHV2y/JmSIns5pVkD33VEWN60SfYtg1ilEwWYj955wIZulM IMaSIrsocpR1/bUyj5TJn71f/5TwX0vZUJRKv47RCe4w==;"},{"key":"arc-message-signature","value":"i=1; a=rsa-sha256; s=2023; d=cloudflare-email.net; c=relaxed/relaxed; h=To:Subject:Date:From:In-Reply-To:References:reply-to:cc:resent-date :resent-from:resent-to:resent-cc:list-id:list-help:list-unsubscribe :list-subscribe:list-post:list-owner:list-archive; t=1714959016; x=1715563816; bh=Zi//1dZsPxUotIaKJ1kvgBYFrjOyHyl+Dzx7wsPG8Aw=; b=aG8ixOYQvd YECuIh8Z8jnl97nGX0LUYrjn1qcCccInNTXZ7RqxKeh7sSEv650EQlcLot0VEj/PEBgrTsaAflr C9O2rrzaUnOJJmUk0yvRGHVDsP7LtfibRykM9ZGFSd5qWOyFVTeCTzVItH4Drz7532LNZuWX3Ap 1JTqAdxXuCXCODhVZvesufPN0duh1rJaAy1mDVfcZpWcyI25CpHH7Z7h3IHet3h4G/AYW/FqEYv c1wgGzRVIIV0YFGY+/Jl6hdhvTUgsh0wTqGx6xc5HORmOy97e/a22IC/IpTd+HjzHkyKJOZeub3 KXsN6W20nLgAcZEQDVXB06xN38gDhhyA==;"},{"key":"arc-authentication-results","value":"i=1; mx.cloudflare.net; dkim=pass header.d=gmail.com header.s=20230601 header.b=J1YNK63G; dmarc=pass header.from=gmail.com policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-yb1-xb2d.google.com) smtp.helo=mail-yb1-xb2d.google.com; spf=pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2d as permitted sender) smtp.mailfrom=hocgin@gmail.com; arc=none smtp.remote-ip=2607:f8b0:4864:20::b2d"},{"key":"received-spf","value":"pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2d as permitted sender) receiver=mx.cloudflare.net; client-ip=2607:f8b0:4864:20::b2d; envelope-from=\"hocgin@gmail.com\"; helo=mail-yb1-xb2d.google.com;"},{"key":"authentication-results","value":"mx.cloudflare.net; dkim=pass header.d=gmail.com header.s=20230601 header.b=J1YNK63G; dmarc=pass header.from=gmail.com policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-yb1-xb2d.google.com) smtp.helo=mail-yb1-xb2d.google.com; spf=pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2d as permitted sender) smtp.mailfrom=hocgin@gmail.com; arc=none smtp.remote-ip=2607:f8b0:4864:20::b2d"},{"key":"received","value":"by mail-yb1-xb2d.google.com with SMTP id 3f1490d57ef6-de8b683f76cso2876903276.1 for <test@hocg.in>; Sun, 05 May 2024 18:30:16 -0700 (PDT)"},{"key":"dkim-signature","value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=gmail.com; s=20230601; t=1714959016; x=1715563816; darn=hocg.in; h=to:subject:message-id:date:from:in-reply-to:references:mime-version :from:to:cc:subject:date:message-id:reply-to; bh=Zi//1dZsPxUotIaKJ1kvgBYFrjOyHyl+Dzx7wsPG8Aw=; b=J1YNK63G+wNd1hyEBrPm++MUJmKkw54Umq49JN7xVQCfYMJt5bzF1uTaCcsE3vQIN0 PV/wwF6pjO/1yJLhQxhbuCvFo/DiwMvq1trm5BKuhoT5Yoa3s+DnRuOx3gUDrKWPOJBi V/HT5TVUQZ+Z0h24RnD7aIOQtIrEexP7WBF2OApTU6BTsNTtsli/g7kKDsyWR7FJVQJk UmqBC6SNj9AlMhbBJX2KZpagooWftTHe0mPRELrYonW1sUVL/icBSPrpLddCBZmBKQS2 /EDgDQsqmQF2XPRs0yKXUbn8sWhsO0J4ZuZG2W5WQpa6KUZXUjTRyWgSTd2H7/41HDGC eicQ=="},{"key":"x-google-dkim-signature","value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=1e100.net; s=20230601; t=1714959016; x=1715563816; h=to:subject:message-id:date:from:in-reply-to:references:mime-version :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to; bh=Zi//1dZsPxUotIaKJ1kvgBYFrjOyHyl+Dzx7wsPG8Aw=; b=wB47/741emQgdrxsH0Ep+a7+eyIixxGp2dKpkVKRkEOsxG/gLbqxpOl/NzPAwuv0qb KqsqzEoS+j+QeqqSc46na65cPhdcKFX2c6LJ6HcC+EuMIzXoWOwhLBrbF4pfKsl0hxB/ yGItZoqL8Ef7nGeLv26RcENEBAkWGB3HSFtCRGzAFSEEyhfWvC0Su4zpzLLahwaqblEH vuOIoDIWry9rzhRnFrDZQN2bQI46mV6k1x1KH9x0VD9eLJO+QiMn4TJQFdK2IC+WIGLM nFxPGuImUez1IOl2BQ0iMw1xQHSfY/qNJst+9WXV/xfH1zKtHq4ZDjOux2El17A/fvNY dNwA=="},{"key":"x-gm-message-state","value":"AOJu0Yyk3qVoBEnc3XBMO5FAjdfhT7S3p3AYHR7PFjzzvHPGIZJEgy1y gIqg56+YVAJRFUESPL2iSJGrdwwPCshZDv/YCAZBnZ11PEH7pXOlCx/FVEEz7w4k+cCt6GOYeu0 zLdcMoaIkhjwJjT+Kxx2NOPIGFS0FFBrIyNAGkA=="},{"key":"x-google-smtp-source","value":"AGHT+IGKnViY9oiKldQjwq8LvD+iidC6+KFq9bZAe/zote9ldGn9Tb6f0L3Y2HrPXkTfpnHycVASTiXhKUr0cSE7HHE="},{"key":"x-received","value":"by 2002:a25:848f:0:b0:deb:45e3:b0f9 with SMTP id v15-20020a25848f000000b00deb45e3b0f9mr4914714ybk.29.1714959015862; Sun, 05 May 2024 18:30:15 -0700 (PDT)"},{"key":"mime-version","value":"1.0"},{"key":"references","value":"<hocgin/logspot/pull/17@github.com> <hocgin/logspot/pull/17/c2087933559@github.com>"},{"key":"in-reply-to","value":"<hocgin/logspot/pull/17/c2087933559@github.com>"},{"key":"from","value":"=?UTF-8?B?5aSP5LiN5p2l?= <hocgin@gmail.com>"},{"key":"date","value":"Mon, 6 May 2024 09:30:02 +0800"},{"key":"message-id","value":"<CAPGKVH-+Y=pHP+QFCiHgkD9OpRFXQnMcaqoYscO+qscLfwC1=A@mail.gmail.com>"},{"key":"subject","value":"Fwd: [hocgin/logspot] Feature 20240117 (PR #17)"},{"key":"to","value":"test@hocg.in"},{"key":"content-type","value":"multipart/alternative; boundary=\"000000000000f1ea410617bf029a\""}]','{"address":"hocgin@gmail.com","name":"夏不来"}',NULL,NULL,NULL,NULL,'[{"address":"test@hocg.in","name":""}]',NULL,NULL,'Fwd: [hocgin/logspot] Feature 20240117 (PR #17)','<CAPGKVH-+Y=pHP+QFCiHgkD9OpRFXQnMcaqoYscO+qscLfwC1=A@mail.gmail.com>','<hocgin/logspot/pull/17/c2087933559@github.com>','<hocgin/logspot/pull/17@github.com> <hocgin/logspot/pull/17/c2087933559@github.com>','2024-05-06T01:30:02.000Z',replace('<div dir="ltr"><div class="gmail_quote"><p dir="auto"><strong>The latest updates on your projects</strong>. Learn more about <a href="https://vercel.link/github-learn-more" rel="nofollow" target="_blank">Vercel for Git ↗︎</a></p>\n<table role="table">\n<thead>\n<tr>\n<th align="left">Name</th>\n<th align="left">Status</th>\n<th align="left">Preview</th>\n<th align="left">Updated (UTC)</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td align="left"><strong>logspot</strong></td>\n<td align="left">🔄 Building (<a href="https://vercel.com/hocgins-projects/logspot/DW2M7ip5svbogxbE8iEhRgE6g2s2" rel="nofollow" target="_blank">Inspect</a>)</td>\n<td align="left"><a href="https://logspot-git-feature-20240117-hocgins-projects.vercel.app" rel="nofollow" target="_blank">Visit Preview</a></td>\n<td align="left">May 1, 2024 3:46am</td>\n</tr>\n</tbody>\n</table>\n\n<p style="font-size:small;color:#666">—<br>Reply to this email directly, <a href="https://github.com/hocgin/logspot/pull/17#issuecomment-2087933559" target="_blank">view it on GitHub</a>, or <a href="https://github.com/notifications/unsubscribe-auth/AD6FAOWVUWK3L3XQ5MGEC4DZABQSJAVCNFSM6AAAAABHBM467CVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHMZDAOBXHEZTGNJVHE" target="_blank">unsubscribe</a>.<br>You are receiving this because you modified the open/close state.<img src="https://github.com/notifications/beacon/AD6FAOTGSPEMYITVKUS44N3ZABQSJA5CNFSM6AAAAABHBM467CWGG33NNVSW45C7OR4XAZNMJFZXG5LFINXW23LFNZ2KUY3PNVWWK3TUL5UWJTT4ONLHO.gif" height="1" width="1" alt=""><span style="color:transparent;font-size:0;display:none;overflow:hidden;opacity:0;width:0;height:0;max-width:0;max-height:0">Message ID: <span>&lt;hocgin/logspot/pull/17/c2087933559</span><span>@</span><span>github</span><span>.</span><span>com&gt;</span></span></p>\n</div></div>\n\n','\n',char(10)),replace('*The latest updates on your projects*. Learn more about Vercel for Git ↗︎\n<https://vercel.link/github-learn-more>\nName Status Preview Updated (UTC)\n*logspot* 🔄 Building (Inspect\n<https://vercel.com/hocgins-projects/logspot/DW2M7ip5svbogxbE8iEhRgE6g2s2>)\nVisit\nPreview <https://logspot-git-feature-20240117-hocgins-projects.vercel.app> May\n1, 2024 3:46am\n\n—\nReply to this email directly, view it on GitHub\n<https://github.com/hocgin/logspot/pull/17#issuecomment-2087933559>, or\nunsubscribe\n<https://github.com/notifications/unsubscribe-auth/AD6FAOWVUWK3L3XQ5MGEC4DZABQSJAVCNFSM6AAAAABHBM467CVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHMZDAOBXHEZTGNJVHE>\n.\nYou are receiving this because you modified the open/close state.Message\nID: <hocgin/logspot/pull/17/c2087933559@github.com>\n\n','\n',char(10)),'[]','test@hocg.in',1,0,0,'2024-05-06 01:30:17','2024-05-06T01:30:22.115+00:00');
INSERT INTO Mail VALUES(3,'[{"key":"received","value":"from mail-yb1-xb2d.google.com (2607:f8b0:4864:20::b2d) by cloudflare-email.net (unknown) id ys8SbW7PeiOm for <test@hocg.in>; Mon, 06 May 2024 01:31:09 +0000"},{"key":"arc-seal","value":"i=1; a=rsa-sha256; s=2023; d=cloudflare-email.net; cv=none; b=Q6gOicHCwER+XQV7q9e2tll2BGgmnQZLeD5n2XMEG+u5cI5awkf1YX05vy3ARisT/Y3sEBeNf zSIoKBR27T5hrjc0NSg2JVnqOyZCfynavqEVBDUYZ1m6JRITsI8a8ItNfw6x9FRhrYVk5f4FWCG WAOHY0ta7S4jWbuRJtytwfZADU0b5bm0uyDcQ2qJzOUfGMq+UHn4XHEgue6NyoGaLlbIpPEhV3R YLjxOHsxV7EbAeqV7wJSyByEnhIHAvixPxMz+MzGU1dnIPDor3JGyiySvnlAS71CBEs5VVZA9vZ sPuNFZcP/zc5uOEL0swZLQeRFSH88eDrLnkBjc4rOFJg==;"},{"key":"arc-message-signature","value":"i=1; a=rsa-sha256; s=2023; d=cloudflare-email.net; c=relaxed/relaxed; h=To:Subject:Date:From:reply-to:cc:resent-date:resent-from:resent-to :resent-cc:in-reply-to:references:list-id:list-help:list-unsubscribe :list-subscribe:list-post:list-owner:list-archive; t=1714959069; x=1715563869; bh=/yZKWvqH7KnLtGimjjExcxaR1hGRwh5SA+71+WCJXJ8=; b=S6yU1GXS8k MI1Vl188aG0Nnjf+U03Vhm/Y6y7hVg7rDdhc3n2Xq4vK7efMCBBaKpCNP8ZmzbAL+9MgrboZBOV pasQYvBQUuXkXykU36T9gfXPDxqpxHL0r5oivp8CDTw4N9P484df/VeGi9SPXXQK2Aw5ageQ+dM mJcTOdYuX4jTkfXwzjtvpoz+RxvJynhZPy9eghey0cKNM7JPwM+norKF8xDJMCsFG3bjmNPYiu5 f8koZ3Pn2WOJt4tcuMtwE1DxyfmBzeQdPzSJDUkjID7nyjK+uPo/JF2vECzDbWJdQ2RoqlGb+cF MyPho5I8Xtlsg2Gwt6cj41TooAh1QGFA==;"},{"key":"arc-authentication-results","value":"i=1; mx.cloudflare.net; dkim=pass header.d=gmail.com header.s=20230601 header.b=av9ExqV8; dmarc=pass header.from=gmail.com policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-yb1-xb2d.google.com) smtp.helo=mail-yb1-xb2d.google.com; spf=pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2d as permitted sender) smtp.mailfrom=hocgin@gmail.com; arc=none smtp.remote-ip=2607:f8b0:4864:20::b2d"},{"key":"received-spf","value":"pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2d as permitted sender) receiver=mx.cloudflare.net; client-ip=2607:f8b0:4864:20::b2d; envelope-from=\"hocgin@gmail.com\"; helo=mail-yb1-xb2d.google.com;"},{"key":"authentication-results","value":"mx.cloudflare.net; dkim=pass header.d=gmail.com header.s=20230601 header.b=av9ExqV8; dmarc=pass header.from=gmail.com policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-yb1-xb2d.google.com) smtp.helo=mail-yb1-xb2d.google.com; spf=pass (mx.cloudflare.net: domain of hocgin@gmail.com designates 2607:f8b0:4864:20::b2d as permitted sender) smtp.mailfrom=hocgin@gmail.com; arc=none smtp.remote-ip=2607:f8b0:4864:20::b2d"},{"key":"received","value":"by mail-yb1-xb2d.google.com with SMTP id 3f1490d57ef6-db4364ecd6aso1231753276.2 for <test@hocg.in>; Sun, 05 May 2024 18:31:09 -0700 (PDT)"},{"key":"dkim-signature","value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=gmail.com; s=20230601; t=1714959069; x=1715563869; darn=hocg.in; h=to:subject:message-id:date:from:mime-version:from:to:cc:subject :date:message-id:reply-to; bh=/yZKWvqH7KnLtGimjjExcxaR1hGRwh5SA+71+WCJXJ8=; b=av9ExqV8EKJ1udaKzwqqlWPGIhCKVzEek+ZnzXuZoRJ9H1nhrMiYtM4IOFMXnwRRvb E4VVlphyPKAIgxTrq3y6Qyf/aC4A60hu8s9g45ou4ZZ3KxxBX4Fr2BvzDQGXAjmTO9Vf Z61Y9sgkEH9n4FeBPeUMp3r2fc7R69nrbyu7lA+wdAHyOFmU+XR5DcbqJalVkP5F3ppT HNWwH3oBV590BT7fMn2fe2cmzwz/N/d1W2DwBbuhXHVIlMovyZbZDRr/Ncg8t7AhzoFq BTcZG6M6aX5aKmvYE62tGmWlOLwEFK7X4qpeoITotzaF1wanfIWHeqQhzYm7vsOIh/xX o8XQ=="},{"key":"x-google-dkim-signature","value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=1e100.net; s=20230601; t=1714959069; x=1715563869; h=to:subject:message-id:date:from:mime-version:x-gm-message-state :from:to:cc:subject:date:message-id:reply-to; bh=/yZKWvqH7KnLtGimjjExcxaR1hGRwh5SA+71+WCJXJ8=; b=amcRaGoRQrROrKaEyTpbSrkA6oJRPcdhy+mTZEeRsaLphviVGJUsjSizmCIEaSPE2I CMKjj/1nOB/16LNchfMY4sb49eEt70GSWbdQwSo49EIks5Nq70NZKY0tf16jYGrTeVh+ OIYcd07ziSF9PNgGVKpGkuD+l4H2xpnWl157odFS3+hfCPh0/rO5wZldp55ekBStn+Dr QBNO4fEQqP11o9W/STNruoKDqsQYW707JvGJVNIh/2GH0jiLPLNbxnLm7BLg7KeMCA7K 4mpfln3FRA2g5JfvpVcgRuVevgexRvWYjB8LKe1aGndvtQZa0zFGuaKHmhaX1mYJLhHv VR0g=="},{"key":"x-gm-message-state","value":"AOJu0YxJE9AFa48cQq3kiU+rHMXQnRye4i6Cqtu4p3uxuYHV90+6uRBg PCjB8PYADI2gTNyrQrvWA5sEmMDnw/1WhZ3xV0h69AhgDNyWjEY3GYm8/w3dsr1JtLUU/52Zt6R ipI0DkM3Y8MGOcX91QnnvBKF3m66iNxoyv26BvCFK"},{"key":"x-google-smtp-source","value":"AGHT+IF+4aTQZjoReTCwrErIWXSxdGf7h50o1snSYbq/QSuwdY4ZfafITBdyD/9WJUqxRdQJotpEeszeJlAY00ZLCX4="},{"key":"x-received","value":"by 2002:a25:8a02:0:b0:dc2:421e:c943 with SMTP id g2-20020a258a02000000b00dc2421ec943mr8107099ybl.42.1714959068852; Sun, 05 May 2024 18:31:08 -0700 (PDT)"},{"key":"mime-version","value":"1.0"},{"key":"from","value":"=?UTF-8?B?5aSP5LiN5p2l?= <hocgin@gmail.com>"},{"key":"date","value":"Mon, 6 May 2024 09:30:56 +0800"},{"key":"message-id","value":"<CAPGKVH-9MBiH7rggi-zDXZH7j2XDRDdVmC96noByKiUOnUCp9g@mail.gmail.com>"},{"key":"subject","value":"=?UTF-8?B?5L2g5aW9IPCfkYs=?="},{"key":"to","value":"test@hocg.in"},{"key":"content-type","value":"multipart/alternative; boundary=\"0000000000001a7cbc0617bf0619\""}]','{"address":"hocgin@gmail.com","name":"夏不来"}',NULL,NULL,NULL,NULL,'[{"address":"test@hocg.in","name":""}]',NULL,NULL,'你好 👋','<CAPGKVH-9MBiH7rggi-zDXZH7j2XDRDdVmC96noByKiUOnUCp9g@mail.gmail.com>',NULL,NULL,'2024-05-06T01:30:56.000Z',replace(replace('<div dir="ltr">你好 👋<br></div>\r\n','\r',char(13)),'\n',char(10)),replace(replace('你好 👋\r\n','\r',char(13)),'\n',char(10)),'[]','test@hocg.in',1,1,0,'2024-05-06 01:31:09','2024-05-06T01:31:21.023+00:00');
