export type Profile = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string;
  created_at?: string;
};

export type Post = {
  id: number;
  author_id: string;
  body: string;
  kind: 'Post' | 'Foto' | 'Vídeo' | 'Doação' | 'Projeto';
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  author: Profile;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

export type Comment = {
  id: number;
  post_id: number;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile;
};

export type Listing = {
  id: number;
  seller_id: string;
  title: string;
  description: string;
  listing_type: 'venda' | 'troca' | 'doacao';
  price: number | null;
  location: string;
  image_url: string | null;
  category: string | null;
  images: string[];
  status: 'active' | 'reserved' | 'completed' | 'paused' | 'sold' | 'closed';
  created_at: string;
  seller: Profile;
};

export type Cause = {
  id: number;
  creator_id: string;
  title: string;
  description: string;
  goal_amount: number;
  raised_amount: number;
  support_count: number;
  image_url: string | null;
  status: 'active' | 'completed' | 'paused' | 'closed';
  created_at: string;
  creator: Profile;
};

export type Message = {
  id: number;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Conversation = {
  profile: Profile;
  lastMessage: Message;
  unread: number;
};

export type Notification = {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: 'follow' | 'like' | 'comment' | 'message' | 'payment' | 'system';
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Profile | null;
};
