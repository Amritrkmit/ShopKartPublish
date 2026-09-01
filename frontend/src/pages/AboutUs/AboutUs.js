import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';

function removeShortcodes(str) {
  return str.replace(/\[\/?vc_[^\]]*\]/g, '');
}

const PostsList = () => {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: null });

  useEffect(() => {
    fetch('https://www.ketchum.com/wp-json/wp/v2/posts/')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setPosts(data);
        setStatus({ loading: false, error: null });
      })
      .catch(error => {
        setStatus({ loading: false, error: error.message });
      });
  }, []);

  if (status.loading) return <p>Loading posts...</p>;
  if (status.error) return <p>Error: {status.error}</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {posts.map(post => (
        <article key={post.id} className="post border rounded shadow p-4 flex flex-col col-12 col-sm-12 col-md-12 mb-4">
          <img
            src={post.featured_image_src}
            alt={post.title.rendered}
            className="max-w-full h-auto mb-4"
          />
          <h2 className="text-lg font-bold mb-2" dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
          <div className="flex-grow mb-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(removeShortcodes(post.excerpt.rendered)) }} />

          <Link
            to={`/about-us/${post.slug}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow text-center w-1/2 mx-auto block"
          >
            Read More
          </Link>
        </article>
      ))}
    </div>
  );
};

export default PostsList;
