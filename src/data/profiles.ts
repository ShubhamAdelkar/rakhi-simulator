export const profiles = [
  { id: "mayu", name: "Mayu", image: "/mayu.jpg" },
  { id: "sai", name: "Sai", image: "/sai.jpg" },
  { id: "chotu", name: "Chotu", image: "/chotu.jpg" },
  { id: "samu", name: "Samu", image: "/samu.jpeg" },
  { id: "cat", name: "Cat", image: "/cat-meme2.gif" },
  { id: "raja", name: "Raja", image: "/raja.jpg" },
  { id: "sumedh", name: "Sumedh", image: "/sumedh.jpg" },
];

export const rakhis = [
  { id: "heart", name: "Heart Rakhi", image: "/heart-rakhi.png", value: 65 },
  {
    id: "blue-traditional",
    name: "Blue Traditional",
    image: "/blue-traditional-rakhi.png",
    value: 90,
  },
  {
    id: "ganesha",
    name: "Ganesha Rakhi",
    image: "/ganesha-rakhi.png",
    value: 95,
  },
  { id: "flower", name: "Flower Rakhi", image: "/flower-rakhi.png", value: 72 },
  { id: "om", name: "Om Rakhi", image: "/om-rakhi.png", value: 85 },
  {
    id: "peacock",
    name: "Peacock Rakhi",
    image: "/peacock-rakhi.png",
    value: 100,
  },
];

export const handImage = "/right-hand.png";

export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
