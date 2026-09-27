/**
 * Serializes user data using a strict allow-list.
 * Never exposes password_hash.
 * Omits private fields unless viewerId is the owner or viewer is an admin.
 */
export const toPublicProfile = (userRow, viewerId = null, isAdmin = false) => {
  if (!userRow) return null;

  const isOwner = viewerId && String(viewerId) === String(userRow.id);
  const allowPrivate = isOwner || isAdmin;

  const publicData = {
    id: userRow.id,
    username: userRow.username,
    full_name: userRow.full_name,
    email: allowPrivate ? userRow.email : undefined,
    profile_picture: userRow.profile_picture || null,
    college: userRow.college || null,
    branch: userRow.branch || null,
    graduation_year: userRow.graduation_year || null,
    bio: userRow.bio || null,
    location: userRow.location || null,
    role: userRow.role,
    status: userRow.status,
    created_at: userRow.created_at,
    updated_at: userRow.updated_at
  };

  if (allowPrivate && userRow.phone !== undefined) {
    publicData.phone = userRow.phone;
  }

  // Include attached collections if provided
  if (userRow.skills) publicData.skills = userRow.skills;
  if (userRow.external_profiles) publicData.external_profiles = userRow.external_profiles;
  if (userRow.services) publicData.services = userRow.services;
  if (userRow.endorsements) publicData.endorsements = userRow.endorsements;
  if (userRow.connection_status) publicData.connection_status = userRow.connection_status;

  return publicData;
};
