// /src/pages/AboutUs/PostDetails.js

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';

function removeShortcodes(str) {
  return str.replace(/\[\/?vc_[^\]]*\]/g, '');
}

const PostDetails = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: null });

  useEffect(() => {
    setStatus({ loading: true, error: null });

    fetch(`https://www.ketchum.com/wp-json/wp/v2/posts?slug=${slug}&_embed`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.length === 0) {
          throw new Error('Post not found');
        }
        setPost(data[0]);
        setStatus({ loading: false, error: null });
      })
      .catch(error => {
        setStatus({ loading: false, error: error.message });
      });
  }, [slug]);

  if (status.loading) return <p className="text-center">Loading...</p>;
  if (status.error) return <p className="text-center text-red-500">Error: {status.error}</p>;
  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4" dangerouslySetInnerHTML={{ __html: post.title.rendered }} />

      {post.featured_image_src && (
        <img
          src={post.featured_image_src}
          alt={post.title.rendered}
          className="w-full h-auto mb-6 rounded shadow"
        />
      )}

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(removeShortcodes(post.content.rendered)),
        }}
      />

      <Link
        to="/about-us/blogs/"
        className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-semibold"
      >
        ← Back to blogs
      </Link>
    </div>
  );
};

export default PostDetails;
