import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

function useUserDashboard(userId) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);

  useEffect(() => {
    fetch(`/api/users/${userId}/posts`).then(r => r.json()).then(setPosts);
  }, [userId]);

  useEffect(() => {
    fetch(`/api/users/${userId}/comments`).then(r => r.json()).then(setComments);
  }, [userId]);

  useEffect(() => {
    const ws = new WebSocket('/ws/notifications');
    ws.onmessage = (e) => setNotifications(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.close();
  }, []);

  const memoizedPosts = useMemo(() => posts.filter(p => p.published), [posts]);

  const handleUpdate = useCallback(() => {
    setIsLoading(true);
  }, []);

  return { user, posts: memoizedPosts, comments, notifications, preferences, isLoading, handleUpdate };
}

export default useUserDashboard;
