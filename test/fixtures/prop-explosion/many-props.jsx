import React from 'react';

const UserProfile = ({ firstName, lastName, email, phone, avatar, address, role, permissions, isActive, onUpdate }) => {
  return (
    <div>
      <img src={avatar} alt={firstName} />
      <h1>{firstName} {lastName}</h1>
      <p>{email}</p>
      <p>{phone}</p>
      <p>{address}</p>
      <span>{role}</span>
      <span>{isActive ? 'Active' : 'Inactive'}</span>
      <button onClick={onUpdate}>Update</button>
    </div>
  );
};

export default UserProfile;
