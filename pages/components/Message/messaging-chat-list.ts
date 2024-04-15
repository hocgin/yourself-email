export type MessagingChatListProps = {
  id: number;
  avatar: string;
  name: string;
  message: string;
  count: number;
  time: string;
  active?: boolean;
};

const messagingChatList: MessagingChatListProps[] = [
  {
    id: 1,
    name: "Tony Reichert",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/2222bfce7311f85ca51a6ffcf8bd3156.jpg",
    message: "Hi, I'm having trouble logging into my account. Can you help?",
    count: 6,
    time: "12:34",
  },
  {
    id: 2,
    name: "Jordan Davi",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/d958cf406bb83c3c0a93e2f03fcb0bef.jpg",
    message:
      "I keep getting an error message when I try to checkout my cart. The error code is 5003.m",
    count: 2,
    time: "18:40",
  },
  {
    id: 3,
    name: "Taylor Smith",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg",
    message:
      "I noticed a charge on my credit card from your service, but I don’t remember authorizing it. Can you explain what it's for?",
    count: 0,
    time: "12:19",
    active: true,
  },
  {
    id: 4,
    name: "Casey Williams",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/f4d075c1fa8155478e5bb26aaae69fc1.jpg",
    message: "I've forgotten my password and can't seem to reset it using the website.",
    count: 1,
    time: "22:04",
  },
  {
    id: 5,
    name: "Robin Rodriguez",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/6c4d4c601258595c0e575d384c091223.jpg",
    message:
      "Hey there, I just received my order, but the item is damaged. What can I do about this?",
    count: 4,
    time: "17:05",
  },
  {
    id: 6,
    name: "Brian Kim",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/9c4d361cb9f54e38261e75afcd23b9b1.jpg",
    message:
      "I've been on hold for over 30 minutes trying to reach customer service. Is there a faster way to get help?",
    count: 0,
    time: "20:11",
  },
  {
    id: 7,
    name: "Michael Hunt",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/51aa83c10615c1bc383e1b2573c0456e.jpg",
    message:
      "I was charged for a subscription renewal, but I had canceled it last week. Can you check what happened?",
    count: 3,
    time: "22:35",
  },
  {
    id: 8,
    name: "Samantha Brooks",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/e1b8ec120710c09589a12c0004f85825.jpg",
    message:
      "I'm having difficulty installing the software I purchased from your site. Is there a guide or customer support line I can call?",
    count: 2,
    time: "15:13",
  },
  {
    id: 9,
    name: "Frank Harrison",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/6c4d4c601258595c0e575d384c091223.jpg",
    message:
      "My promo code isn't working at checkout even though it's supposed to be valid until the end of the month. Can you assist?",
    count: 0,
    time: "11:35",
  },
  {
    id: 10,
    name: "Emma Adams",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/f4d075c1fa8155478e5bb26aaae69fc1.jpg",
    message:
      "I've changed my email address and need to update my account details. How can I do this securely?",
    count: 0,
    time: "19:04",
  },
  {
    id: 11,
    name: "Tony Reichert",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/2222bfce7311f85ca51a6ffcf8bd3156.jpg",
    message: "Hi, I'm having trouble logging into my account. Can you help?",
    count: 6,
    time: "12:34",
  },
  {
    id: 12,
    name: "Jordan Davi",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/d958cf406bb83c3c0a93e2f03fcb0bef.jpg",
    message:
      "I keep getting an error message when I try to checkout my cart. The error code is 5003.m",
    count: 2,
    time: "18:40",
  },
  {
    id: 13,
    name: "Taylor Smith",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg",
    message:
      "I noticed a charge on my credit card from your service, but I don’t remember authorizing it. Can you explain what it's for?",
    count: 0,
    time: "12:19",
  },
  {
    id: 14,
    name: "Casey Williams",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/f4d075c1fa8155478e5bb26aaae69fc1.jpg",
    message: "I've forgotten my password and can't seem to reset it using the website.",
    count: 1,
    time: "22:04",
  },
  {
    id: 15,
    name: "Robin Rodriguez",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/6c4d4c601258595c0e575d384c091223.jpg",
    message:
      "Hey there, I just received my order, but the item is damaged. What can I do about this?",
    count: 4,
    time: "17:05",
  },
  {
    id: 16,
    name: "Brian Kim",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/9c4d361cb9f54e38261e75afcd23b9b1.jpg",
    message:
      "I've been on hold for over 30 minutes trying to reach customer service. Is there a faster way to get help?",
    count: 0,
    time: "20:11",
  },
  {
    id: 17,
    name: "Michael Hunt",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/51aa83c10615c1bc383e1b2573c0456e.jpg",
    message:
      "I was charged for a subscription renewal, but I had canceled it last week. Can you check what happened?",
    count: 3,
    time: "22:35",
  },
  {
    id: 18,
    name: "Samantha Brooks",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/e1b8ec120710c09589a12c0004f85825.jpg",
    message:
      "I'm having difficulty installing the software I purchased from your site. Is there a guide or customer support line I can call?",
    count: 2,
    time: "15:13",
  },
  {
    id: 19,
    name: "Frank Harrison",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/6c4d4c601258595c0e575d384c091223.jpg",
    message:
      "My promo code isn't working at checkout even though it's supposed to be valid until the end of the month. Can you assist?",
    count: 0,
    time: "11:35",
  },
  {
    id: 20,
    name: "Emma Adams",
    avatar:
      "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/f4d075c1fa8155478e5bb26aaae69fc1.jpg",
    message:
      "I've changed my email address and need to update my account details. How can I do this securely?",
    count: 0,
    time: "19:04",
  },
];

export default messagingChatList;
