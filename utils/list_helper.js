const dummy = () => 1

const totalLikes = (blogs) => {
  const reducer = (sum, blog) => sum + (blog.likes || 0)
  return blogs.reduce(reducer, 0)
}

module.exports = {
  dummy,
  totalLikes,
}