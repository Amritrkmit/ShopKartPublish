import React from 'react';
import './ContactUs.css';

const ContactUs = () => {
  return (
    <div className="about-us-container">
      <h1>ContactUs Flipkart</h1>

      <section className="about-intro">
        <p>
          Flipkart is India’s leading e-commerce marketplace, offering a wide
          range of products from electronics to fashion, home essentials, and
          more. Founded in 2007, Flipkart has revolutionized online shopping in
          India with its customer-centric approach and innovative technology.
        </p>
      </section>

      <section className="about-values">
        <h2>Our Mission & Values</h2>
        <ul>
          <li><strong>Customer Centricity:</strong> We prioritize our customers' needs above everything else.</li>
          <li><strong>Innovation:</strong> Constantly innovating to provide the best shopping experience.</li>
          <li><strong>Integrity:</strong> We conduct business with transparency and honesty.</li>
          <li><strong>Inclusivity:</strong> Making e-commerce accessible to every corner of India.</li>
          <li><strong>Quality:</strong> Providing only genuine and quality products.</li>
        </ul>
      </section>

      <section className="about-history">
        <h2>Our Journey</h2>
        <p>
          Starting from a small team with a big vision, Flipkart has grown into
          a trusted brand serving millions of customers across India. Our
          journey is powered by passion, perseverance, and a commitment to
          excellence.
        </p>
      </section>
    </div>
  );
};

export default ContactUs;
